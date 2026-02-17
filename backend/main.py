"""FastAPI app — serves the REST API and (in production) the built React frontend."""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request

from backend.exceptions import register_exception_handlers
from backend.metadata import build_metadata_index
from backend.middleware import RequestLoggingMiddleware
from backend.routers import filters, opinions, search
from backend.search.engine import CitationScoreFusion

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    t0 = time.monotonic()

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

    openai_available = getattr(engine, "_openai_available", False)
    logger.info("OpenAI available: %s", openai_available)

    elapsed = time.monotonic() - t0
    logger.info("Startup completed in %.1fs", elapsed)

    yield


app = FastAPI(title="FPPC Opinions Search", lifespan=lifespan)

register_exception_handlers(app)
app.add_middleware(RequestLoggingMiddleware)

app.include_router(search.router)
app.include_router(opinions.router)
app.include_router(filters.router)


@app.get("/api/health")
async def health(request: Request):
    engine = getattr(request.app.state, "engine", None)
    metadata = getattr(request.app.state, "metadata", None)
    return {
        "status": "ok",
        "engine_loaded": engine is not None,
        "engine_name": engine.name() if engine else None,
        "opinions_indexed": metadata.total_opinions if metadata else 0,
    }
