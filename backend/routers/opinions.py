"""GET /api/opinions/{opinion_id} — full opinion detail."""

from __future__ import annotations

import json
import logging
import urllib.parse

from fastapi import APIRouter, HTTPException, Request

from backend.config import settings
from backend.models import CitedOpinion, OpinionDetail

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["opinions"])


@router.get("/opinions/{opinion_id}", response_model=OpinionDetail)
def get_opinion(opinion_id: str, request: Request):
    metadata = request.app.state.metadata
    meta = metadata.opinions.get(opinion_id)
    if meta is None:
        raise HTTPException(status_code=404, detail="Opinion not found")

    # Load full JSON
    try:
        with open(meta["file_path"], "r") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        logger.exception("Failed to load opinion file: %s", meta["file_path"])
        raise HTTPException(status_code=500, detail="Failed to load opinion data")

    sections = data.get("sections", {})
    citations = data.get("citations", {})
    classification = data.get("classification", {})
    parsed = data.get("parsed", {})
    extraction = data.get("extraction", {})

    # Question/conclusion/facts/analysis with synthetic fallbacks
    question = sections.get("question") or sections.get("question_synthetic")
    conclusion = sections.get("conclusion") or sections.get("conclusion_synthetic")
    facts = sections.get("facts")
    analysis = sections.get("analysis")

    # Build PDF URL
    pdf_url = _build_pdf_url(data)

    # Build cited opinion lists with corpus existence check
    prior_opinions = [
        CitedOpinion(
            opinion_number=op_id,
            exists_in_corpus=op_id in metadata.opinions,
        )
        for op_id in citations.get("prior_opinions", [])
    ]
    cited_by = [
        CitedOpinion(
            opinion_number=op_id,
            exists_in_corpus=op_id in metadata.opinions,
        )
        for op_id in citations.get("cited_by", [])
    ]

    return OpinionDetail(
        id=opinion_id,
        opinion_number=opinion_id,
        date=parsed.get("date"),
        year=data.get("year", 0),
        requestor_name=parsed.get("requestor_name"),
        requestor_title=parsed.get("requestor_title"),
        requestor_city=parsed.get("requestor_city"),
        document_type=parsed.get("document_type"),
        question=question,
        conclusion=conclusion,
        facts=facts,
        analysis=analysis,
        topic_primary=classification.get("topic_primary"),
        topic_secondary=classification.get("topic_secondary"),
        topic_tags=classification.get("topic_tags", []),
        government_code_sections=citations.get("government_code", []),
        regulations=citations.get("regulations", []),
        prior_opinions=prior_opinions,
        cited_by=cited_by,
        pdf_url=pdf_url,
        page_count=extraction.get("page_count"),
        word_count=extraction.get("word_count"),
        has_standard_format=sections.get("has_standard_format"),
    )


def _build_pdf_url(data: dict) -> str | None:
    """Construct R2 PDF URL, falling back to the FPPC source URL."""
    local_pdf_path = data.get("local_pdf_path")
    if settings.r2_pdf_base_url and local_pdf_path:
        # Strip "raw_pdfs/" prefix, URL-encode (preserve slashes)
        relative = local_pdf_path.removeprefix("raw_pdfs/")
        encoded = urllib.parse.quote(relative, safe="/")
        return f"{settings.r2_pdf_base_url.rstrip('/')}/{encoded}"
    # Fallback to FPPC website URL
    return data.get("pdf_url")
