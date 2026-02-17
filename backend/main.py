"""FastAPI app — serves the REST API and (in production) the built React frontend."""

import time

from fastapi import FastAPI

from backend.search.engine import CitationScoreFusion

app = FastAPI(title="FPPC Opinions Search")

# Global search engine instance, loaded at startup
engine: CitationScoreFusion | None = None


@app.on_event("startup")
async def startup():
    global engine
    t0 = time.time()
    engine = CitationScoreFusion()
    elapsed = time.time() - t0
    print(f"Search engine loaded in {elapsed:.1f}s")


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "engine_loaded": engine is not None,
        "engine_name": engine.name() if engine else None,
    }
