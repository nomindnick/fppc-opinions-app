"""GET /api/search — full-text and citation search with filtering/pagination."""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Depends, Query, Request

from backend.middleware import check_rate_limit
from backend.models import SearchResponse, SearchResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["search"])


def _truncate(text: str | None, max_len: int = 300) -> str | None:
    if not text or len(text) <= max_len:
        return text
    # Truncate at last space before max_len
    truncated = text[:max_len]
    last_space = truncated.rfind(" ")
    if last_space > 0:
        truncated = truncated[:last_space]
    return truncated + "..."


@router.get("/search", response_model=SearchResponse, dependencies=[Depends(check_rate_limit)])
async def search(
    request: Request,
    q: str = Query("", description="Search query"),
    topic: str | None = Query(None, description="Filter by topic_primary"),
    statute: str | None = Query(None, description="Filter by government code section"),
    year_start: int | None = Query(None, description="Filter by minimum year"),
    year_end: int | None = Query(None, description="Filter by maximum year"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Results per page"),
):
    filters_applied = {}
    if topic:
        filters_applied["topic"] = topic
    if statute:
        filters_applied["statute"] = statute
    if year_start is not None:
        filters_applied["year_start"] = year_start
    if year_end is not None:
        filters_applied["year_end"] = year_end

    query = q.strip()
    if not query:
        return SearchResponse(
            query=q,
            total_results=0,
            page=page,
            per_page=per_page,
            results=[],
            filters_applied=filters_applied,
        )

    engine = request.app.state.engine
    metadata = request.app.state.metadata

    t0 = time.monotonic()

    # Over-fetch for post-hoc filtering; engine handles OpenAI fallback internally
    try:
        result_ids = engine.search(query, top_k=200)
    except Exception:
        logger.exception("Search engine error for query: %s", query)
        result_ids = []

    # Look up metadata and apply filters
    filtered = []
    for opinion_id in result_ids:
        meta = metadata.opinions.get(opinion_id)
        if meta is None:
            continue

        # Post-hoc filters (AND-combined)
        if topic and meta["topic_primary"] != topic:
            continue
        if statute and statute not in meta["government_code_sections"]:
            continue
        if year_start is not None and meta["year"] < year_start:
            continue
        if year_end is not None and meta["year"] > year_end:
            continue

        filtered.append((opinion_id, meta))

    total_results = len(filtered)

    # Paginate
    start = (page - 1) * per_page
    page_items = filtered[start : start + per_page]

    # Build results with 1-based rank relative to full filtered list
    results = []
    for i, (opinion_id, meta) in enumerate(page_items, start=start + 1):
        topics = [
            t
            for t in [meta["topic_primary"], meta["topic_secondary"]]
            if t is not None
        ]
        results.append(
            SearchResult(
                opinion_id=opinion_id,
                opinion_number=meta["opinion_number"],
                date=meta["date"],
                year=meta["year"],
                question=meta["question"],
                conclusion=_truncate(meta["conclusion"]),
                topics=topics,
                statutes=meta["government_code_sections"],
                rank=i,
                document_type=meta["document_type"],
            )
        )

    elapsed_ms = (time.monotonic() - t0) * 1000
    logger.info("query=%r total_results=%d elapsed_ms=%.0f", query, total_results, elapsed_ms)

    return SearchResponse(
        query=q,
        total_results=total_results,
        page=page,
        per_page=per_page,
        results=results,
        filters_applied=filters_applied,
    )
