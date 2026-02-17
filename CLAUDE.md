# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FPPC Opinions Search — a web app for searching ~14,100 FPPC advisory opinion letters (1975–2025). Single-service architecture: FastAPI backend serves both a REST API and a built React frontend as static files.

## Architecture

```
backend/
  main.py              # FastAPI app, static file serving in production
  config.py            # Settings via pydantic-settings / env vars
  metadata.py          # In-memory metadata index (built at startup from 14K JSON files)
  models.py            # Pydantic request/response schemas
  search/
    interface.py       # SearchEngine ABC
    engine.py          # Experiment 009 citation_score_fusion engine
    utils.py           # tokenize(), parse_query_citations()
  routers/
    search.py          # GET /api/search
    opinions.py        # GET /api/opinions/{id}
    filters.py         # GET /api/filters
frontend/
  src/
    pages/SearchPage.jsx, OpinionPage.jsx
    components/        # SearchBar, ResultCard, FilterBar, OpinionBody, etc.
data/extracted/        # ~14,100 opinion JSON files organized by year (gitignored)
indexes/               # Pre-built pickle files for search engine (gitignored, downloaded from R2 at startup)
```

## Commands

```bash
# Backend
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload                    # Dev server on :8000

# Frontend
cd frontend && npm install
cd frontend && npm run dev                           # Vite dev server with proxy to :8000
cd frontend && npm run build                         # Production build to frontend/dist/

# Tests
pytest backend/                                      # All backend tests
pytest backend/test_file.py::test_name               # Single test
python backend/test_engine.py                        # Verify search engine port

# Production (single service)
bash build.sh                                        # Full build + start
```

## Search Engine

Ported from `fppc-opinions-search-lab` repo (experiment 009). Two query paths, automatically routed:

- **Citation path**: queries with statute references → citation index narrows candidates → BM25 + semantic embedding score fusion (requires OpenAI API call)
- **Non-citation path**: general queries → BM25 full-text only (no API calls)

The engine loads three pickle index files at startup (~162MB total). It is validated against a 65-query eval suite (MRR 0.684) — minimize modifications to avoid regressions.

If OpenAI is unavailable, citation-path queries must fall back to BM25-only silently.

## Data Model

No database. All data is file-based:
- **Opinion JSON** (`data/extracted/{year}/{id}.json`): structured fields including `opinion_number`, `date`, `question`, `conclusion`, `facts`, `analysis`, `topic_primary`, `government_code_sections`, `prior_opinions`
- **Metadata index**: built in-memory at startup for fast results rendering
- **PDFs**: hosted on Cloudflare R2, linked via `R2_PDF_BASE_URL` env var

## Environment Variables

- `OPENAI_API_KEY` — required for citation-path embedding queries
- `R2_PDF_BASE_URL` — Cloudflare R2 base URL for PDF downloads
- `R2_INDEX_BASE_URL` — Cloudflare R2 base URL for downloading search index pickle files at startup
- `PORT` — set by Railway
- `ENV` — `development` or `production` (controls static file serving)

## Key Conventions

- Python: type hints, async FastAPI endpoints, Pydantic models for API schemas
- React: functional components with hooks, React Router, URL params for search state (bookmarkable)
- Styling: Tailwind CSS for layout + custom CSS for typography. Inter (sans) for UI, Lora/Source Serif 4 (serif) for opinion body text. Warm neutral palette (`#FAFAF8` background, warm dark grays)
- Static serving: in production, FastAPI serves `frontend/dist/` and falls back to `index.html` for client-side routing
- Deployment: single Railway service, Procfile-based
