"""MCP server exposing FPPC opinion search tools for LLM/AI integration."""

from __future__ import annotations

import json
import logging
import time

from mcp.server.fastmcp import FastMCP

logger = logging.getLogger(__name__)

# Module-level references set by FastAPI lifespan (avoids double-loading indexes)
_engine = None
_metadata = None

mcp_server = FastMCP(
    name="FPPC Opinions",
    instructions=(
        "Search and retrieve California Fair Political Practices Commission (FPPC) "
        "advisory opinion letters (1975–2025). Use search_opinions to find relevant "
        "opinions by keyword, statute, or topic. Use get_opinion to read the full text "
        "of a specific opinion. Use list_topics to discover available topics and statutes."
    ),
)


def init(engine, metadata):
    """Called during FastAPI lifespan to share engine/metadata with MCP tools."""
    global _engine, _metadata
    _engine = engine
    _metadata = metadata


def _truncate(text: str | None, max_len: int = 300) -> str | None:
    if not text or len(text) <= max_len:
        return text
    truncated = text[:max_len]
    last_space = truncated.rfind(" ")
    if last_space > 0:
        truncated = truncated[:last_space]
    return truncated + "..."


@mcp_server.tool()
def search_opinions(
    query: str,
    topic: str | None = None,
    statute: str | None = None,
    year_start: int | None = None,
    year_end: int | None = None,
    page: int = 1,
    per_page: int = 20,
) -> str:
    """Search ~14,100 FPPC advisory opinion letters (1975–2025).

    Returns opinions ranked by relevance. Queries with statute references
    (e.g. "Section 1090") automatically use citation-aware scoring.

    Args:
        query: Search query (required). Examples: "conflict of interest voting",
               "Section 1090 subcontractor", "campaign contribution limits".
        topic: Filter by topic. Options: conflicts_of_interest, campaign_finance,
               gifts_honoraria, lobbying, other.
        statute: Filter by Government Code section (e.g. "1090", "87100").
        year_start: Filter to opinions from this year or later.
        year_end: Filter to opinions from this year or earlier.
        page: Page number (default 1).
        per_page: Results per page (default 20, max 100).
    """
    if not _engine or not _metadata:
        return json.dumps({"error": "Server not ready — engine not loaded yet"})

    query = query.strip()
    if not query:
        return json.dumps({"error": "Query cannot be empty"})

    per_page = min(max(per_page, 1), 100)
    page = max(page, 1)

    t0 = time.monotonic()

    try:
        result_ids = _engine.search(query, top_k=200)
    except Exception:
        logger.exception("Search engine error for query: %s", query)
        result_ids = []

    # Post-hoc filtering (same logic as REST endpoint)
    filtered = []
    for opinion_id in result_ids:
        meta = _metadata.opinions.get(opinion_id)
        if meta is None:
            continue
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
    start = (page - 1) * per_page
    page_items = filtered[start : start + per_page]

    results = []
    for i, (opinion_id, meta) in enumerate(page_items, start=start + 1):
        topics = [t for t in [meta["topic_primary"], meta["topic_secondary"]] if t]
        results.append({
            "opinion_id": opinion_id,
            "opinion_number": meta["opinion_number"],
            "date": meta["date"],
            "year": meta["year"],
            "question": meta["question"],
            "conclusion": _truncate(meta["conclusion"]),
            "topics": topics,
            "statutes": meta["government_code_sections"],
            "rank": i,
        })

    elapsed_ms = (time.monotonic() - t0) * 1000
    logger.info("MCP search query=%r total=%d elapsed=%.0fms", query, total_results, elapsed_ms)

    return json.dumps({
        "query": query,
        "total_results": total_results,
        "page": page,
        "per_page": per_page,
        "total_pages": (total_results + per_page - 1) // per_page if total_results else 0,
        "results": results,
    })


@mcp_server.tool()
def get_opinion(opinion_id: str) -> str:
    """Get the full text and metadata of a specific FPPC advisory opinion.

    Returns the complete opinion including question, facts, analysis,
    conclusion, citation graph, and metadata.

    Args:
        opinion_id: The opinion ID (e.g. "A-24-003", "90-200", "I-04-123").
    """
    if not _metadata:
        return json.dumps({"error": "Server not ready — metadata not loaded yet"})

    meta = _metadata.opinions.get(opinion_id)
    if meta is None:
        return json.dumps({"error": f"Opinion '{opinion_id}' not found"})

    try:
        with open(meta["file_path"], "r") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        logger.exception("Failed to load opinion file: %s", meta["file_path"])
        return json.dumps({"error": f"Failed to load opinion data for '{opinion_id}'"})

    sections = data.get("sections", {})
    citations = data.get("citations", {})
    classification = data.get("classification", {})
    parsed = data.get("parsed", {})
    extraction = data.get("extraction", {})

    question = sections.get("question") or sections.get("question_synthetic")
    conclusion = sections.get("conclusion") or sections.get("conclusion_synthetic")

    # Build cited opinion lists with corpus existence check
    prior_opinions = [
        {"opinion_number": op_id, "exists_in_corpus": op_id in _metadata.opinions}
        for op_id in citations.get("prior_opinions", [])
    ]
    cited_by = [
        {"opinion_number": op_id, "exists_in_corpus": op_id in _metadata.opinions}
        for op_id in citations.get("cited_by", [])
    ]

    return json.dumps({
        "id": opinion_id,
        "opinion_number": opinion_id,
        "date": parsed.get("date"),
        "year": data.get("year"),
        "requestor_name": parsed.get("requestor_name"),
        "requestor_title": parsed.get("requestor_title"),
        "requestor_city": parsed.get("requestor_city"),
        "document_type": parsed.get("document_type"),
        "question": question,
        "conclusion": conclusion,
        "facts": sections.get("facts"),
        "analysis": sections.get("analysis"),
        "topic_primary": classification.get("topic_primary"),
        "topic_secondary": classification.get("topic_secondary"),
        "topic_tags": classification.get("topic_tags", []),
        "government_code_sections": citations.get("government_code", []),
        "regulations": citations.get("regulations", []),
        "prior_opinions": prior_opinions,
        "cited_by": cited_by,
        "page_count": extraction.get("page_count"),
        "word_count": extraction.get("word_count"),
    })


@mcp_server.tool()
def list_topics() -> str:
    """List available topics, statutes, and corpus statistics.

    Use this to understand what's in the corpus before searching.
    Returns topic categories with counts, top statute sections, and year range.
    """
    if not _metadata:
        return json.dumps({"error": "Server not ready — metadata not loaded yet"})

    # Topics sorted by count
    topics = [
        {"topic": topic, "label": topic.replace("_", " ").title(), "count": count}
        for topic, count in sorted(
            _metadata.topic_counts.items(), key=lambda x: x[1], reverse=True
        )
    ]

    # Top 50 statutes by count (full list is ~1,200)
    top_statutes = [
        {"section": statute, "count": count}
        for statute, count in sorted(
            _metadata.statute_counts.items(), key=lambda x: x[1], reverse=True
        )[:50]
    ]

    return json.dumps({
        "total_opinions": _metadata.total_opinions,
        "year_min": _metadata.year_min,
        "year_max": _metadata.year_max,
        "topics": topics,
        "top_statutes": top_statutes,
        "total_unique_statutes": len(_metadata.statute_counts),
    })
