"""In-memory metadata index built at startup from ~14K opinion JSON files."""

from __future__ import annotations

import json
import logging
import os
import time
from collections import Counter
from dataclasses import dataclass, field
from typing import TypedDict

logger = logging.getLogger(__name__)

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DATA_DIR = os.path.join(_PROJECT_ROOT, "data", "extracted")


class OpinionMeta(TypedDict):
    opinion_number: str
    date: str | None
    year: int
    question: str | None
    conclusion: str | None
    topic_primary: str | None
    topic_secondary: str | None
    government_code_sections: list[str]
    regulations: list[str]
    prior_opinions: list[str]
    cited_by: list[str]
    document_type: str | None
    file_path: str
    local_pdf_path: str | None


@dataclass
class MetadataIndex:
    opinions: dict[str, OpinionMeta] = field(default_factory=dict)
    topic_counts: dict[str, int] = field(default_factory=dict)
    statute_counts: dict[str, int] = field(default_factory=dict)
    year_min: int = 9999
    year_max: int = 0
    total_opinions: int = 0


def build_metadata_index() -> MetadataIndex:
    """Walk data/extracted/{year}/{id}.json and build an in-memory index."""
    t0 = time.time()
    index = MetadataIndex()
    topic_counter: Counter[str] = Counter()
    statute_counter: Counter[str] = Counter()

    if not os.path.isdir(_DATA_DIR):
        logger.warning("Data directory not found: %s", _DATA_DIR)
        return index

    for year_dir in sorted(os.listdir(_DATA_DIR)):
        year_path = os.path.join(_DATA_DIR, year_dir)
        if not os.path.isdir(year_path):
            continue
        for filename in os.listdir(year_path):
            if not filename.endswith(".json"):
                continue
            file_path = os.path.join(year_path, filename)
            try:
                with open(file_path, "r") as f:
                    data = json.load(f)
            except Exception:
                logger.warning("Skipping malformed file: %s", file_path)
                continue

            opinion_id = data.get("id", filename.removesuffix(".json"))
            year = data.get("year", 0)
            sections = data.get("sections", {})
            citations = data.get("citations", {})
            classification = data.get("classification", {})
            parsed = data.get("parsed", {})

            # Question/conclusion with fallback to synthetic
            question = sections.get("question") or sections.get("question_synthetic")
            conclusion = sections.get("conclusion") or sections.get("conclusion_synthetic")

            topic_primary = classification.get("topic_primary")
            topic_secondary = classification.get("topic_secondary")
            gov_code = citations.get("government_code", [])
            regulations = citations.get("regulations", [])
            prior_opinions = citations.get("prior_opinions", [])
            cited_by = citations.get("cited_by", [])

            meta: OpinionMeta = {
                "opinion_number": opinion_id,
                "date": parsed.get("date"),
                "year": year,
                "question": question,
                "conclusion": conclusion,
                "topic_primary": topic_primary,
                "topic_secondary": topic_secondary,
                "government_code_sections": gov_code,
                "regulations": regulations,
                "prior_opinions": prior_opinions,
                "cited_by": cited_by,
                "document_type": parsed.get("document_type"),
                "file_path": file_path,
                "local_pdf_path": data.get("local_pdf_path"),
            }

            index.opinions[opinion_id] = meta

            # Aggregations
            if topic_primary:
                topic_counter[topic_primary] += 1
            for section in gov_code:
                statute_counter[section] += 1

            if year:
                if year < index.year_min:
                    index.year_min = year
                if year > index.year_max:
                    index.year_max = year

    index.topic_counts = dict(topic_counter)
    index.statute_counts = dict(statute_counter)
    index.total_opinions = len(index.opinions)

    # Handle edge case where no opinions were loaded
    if index.total_opinions == 0:
        index.year_min = 0
        index.year_max = 0

    elapsed = time.time() - t0
    logger.info(
        "Metadata index built in %.1fs: %d opinions, years %d–%d",
        elapsed,
        index.total_opinions,
        index.year_min,
        index.year_max,
    )
    return index
