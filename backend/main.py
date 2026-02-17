"""FastAPI app — serves the REST API and (in production) the built React frontend."""

import logging
import time

from fastapi import FastAPI, Request

from backend.metadata import build_metadata_index
from backend.routers import filters, opinions, search
from backend.search.engine import CitationScoreFusion

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="FPPC Opinions Search")

app.include_router(search.router)
app.include_router(opinions.router)
app.include_router(filters.router)


@app.on_event("startup")
async def startup():
    t0 = time.time()
    app.state.engine = CitationScoreFusion()
    engine_elapsed = time.time() - t0
    logger.info("Search engine loaded in %.1fs", engine_elapsed)

    t1 = time.time()
    app.state.metadata = build_metadata_index()
    meta_elapsed = time.time() - t1
    logger.info("Metadata index built in %.1fs", meta_elapsed)


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
