"""FastAPI app — serves the REST API, MCP server, and (in production) the built React frontend."""

import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.config import settings
from backend.exceptions import register_exception_handlers
from backend.mcp_server import init as mcp_init
from backend.mcp_server import mcp_server
from backend.metadata import build_metadata_index
from backend.middleware import RequestLoggingMiddleware
from backend.routers import filters, opinions, search
from backend.search.engine import CitationScoreFusion

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


async def _download_indexes_from_r2():
    """Download search index pickle files from R2 if not present locally."""
    if not settings.r2_index_base_url:
        return

    index_dir = Path("indexes")
    index_dir.mkdir(exist_ok=True)

    index_files = [
        "BM25FullText_index.pkl",
        "embeddings_text-embedding-3-small_qa_text.pkl",
        "BM25CitationBoost_citation_index.pkl",
    ]

    import httpx

    for filename in index_files:
        local_path = index_dir / filename
        if local_path.exists():
            logger.info("Index already exists: %s", filename)
            continue

        url = f"{settings.r2_index_base_url.rstrip('/')}/{filename}"
        logger.info("Downloading index: %s", url)
        t0 = time.monotonic()

        async with httpx.AsyncClient() as client:
            response = await client.get(url, follow_redirects=True, timeout=300.0)
            response.raise_for_status()
            local_path.write_bytes(response.content)

        elapsed = time.monotonic() - t0
        size_mb = local_path.stat().st_size / (1024 * 1024)
        logger.info("Downloaded %s (%.1f MB) in %.1fs", filename, size_mb, elapsed)


def _create_mcp_session_manager():
    """Create a fresh MCP session manager (needed because it's single-use)."""
    from mcp.server.streamable_http_manager import StreamableHTTPSessionManager

    sm = StreamableHTTPSessionManager(
        app=mcp_server._mcp_server,
        json_response=mcp_server.settings.json_response,
        stateless=mcp_server.settings.stateless_http,
    )
    mcp_server._session_manager = sm
    return sm


@asynccontextmanager
async def lifespan(app: FastAPI):
    t0 = time.monotonic()

    # Download indexes from R2 if needed (production)
    await _download_indexes_from_r2()

    app.state.engine = CitationScoreFusion()
    engine = app.state.engine
    logger.info("Search engine loaded: %s", engine.name())

    app.state.metadata = build_metadata_index()
    meta = app.state.metadata
    logger.info(
        "Corpus: %d opinions, %d topics, %d statutes, years %d–%d",
        meta.total_opinions,
        len(meta.topic_counts),
        len(meta.statute_counts),
        meta.year_min,
        meta.year_max,
    )

    # Share engine/metadata with MCP server
    mcp_init(engine, meta)
    logger.info("MCP server initialized")

    openai_available = getattr(engine, "_openai_available", False)
    logger.info("OpenAI available: %s", openai_available)

    elapsed = time.monotonic() - t0
    logger.info("Startup completed in %.1fs", elapsed)

    # Start MCP session manager (fresh instance each time for test compatibility)
    sm = _create_mcp_session_manager()
    # Update the mounted ASGI app's reference
    _mcp_asgi_app.session_manager = sm
    async with sm.run():
        yield


app = FastAPI(title="FPPC Opinions Search", lifespan=lifespan)

register_exception_handlers(app)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["mcp-session-id"],
)

app.include_router(search.router)
app.include_router(opinions.router)
app.include_router(filters.router)

# MCP ASGI handler — session_manager is set during lifespan
from mcp.server.fastmcp.server import StreamableHTTPASGIApp
from starlette.routing import Route

_mcp_asgi_app = StreamableHTTPASGIApp(None)

# Add MCP as a Starlette route directly on the FastAPI router so both
# /mcp and /mcp/ work (app.mount only handles /mcp/ with trailing slash)
app.router.routes.append(Route("/mcp", endpoint=_mcp_asgi_app))
app.router.routes.append(Route("/mcp/", endpoint=_mcp_asgi_app))


@app.get("/api/health")
async def health(request: Request):
    engine = getattr(request.app.state, "engine", None)
    metadata = getattr(request.app.state, "metadata", None)
    return {
        "status": "ok",
        "engine_loaded": engine is not None,
        "engine_name": engine.name() if engine else None,
        "opinions_indexed": metadata.total_opinions if metadata else 0,
        "mcp_endpoint": "/mcp",
    }


# --- Production static file serving ---
if settings.env == "production" and FRONTEND_DIST.is_dir():
    # Serve built assets (JS, CSS, images)
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST / "assets"),
        name="static-assets",
    )

    # SPA catch-all: serve index.html for any non-API, non-MCP route
    @app.get("/{path:path}")
    async def spa_catch_all(path: str):
        return FileResponse(FRONTEND_DIST / "index.html")
