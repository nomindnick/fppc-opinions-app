"""Shared pytest fixtures for backend tests."""

from __future__ import annotations

import json
import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.metadata import MetadataIndex
from backend.middleware import rate_limiter


def _build_test_metadata() -> MetadataIndex:
    """Build a MetadataIndex with 3 realistic test opinions backed by temp JSON files."""
    index = MetadataIndex()

    opinions_data = [
        {
            "id": "A-24-001",
            "year": 2024,
            "date": "2024-03-15",
            "question": "May a council member vote on a matter?",
            "conclusion": "No, the council member has a conflict of interest.",
            "topic_primary": "conflicts_of_interest",
            "topic_secondary": "voting",
            "government_code_sections": ["87100", "87103"],
            "regulations": ["18700"],
            "document_type": "opinion",
        },
        {
            "id": "I-23-045",
            "year": 2023,
            "date": "2023-07-01",
            "question": "Must a lobbyist register?",
            "conclusion": "Yes, the individual meets the definition of a lobbyist.",
            "topic_primary": "lobbying",
            "topic_secondary": None,
            "government_code_sections": ["86100"],
            "regulations": [],
            "document_type": "informal",
        },
        {
            "id": "A-22-100",
            "year": 2022,
            "date": "2022-01-10",
            "question": "Is this gift reportable?",
            "conclusion": "Yes, the gift exceeds the reporting threshold.",
            "topic_primary": "gifts",
            "topic_secondary": "reporting",
            "government_code_sections": ["89503"],
            "regulations": ["18940"],
            "document_type": "opinion",
        },
    ]

    # Create temp JSON files so the opinion detail endpoint can read them
    temp_dir = tempfile.mkdtemp()
    for op in opinions_data:
        file_path = os.path.join(temp_dir, f"{op['id']}.json")
        full_data = {
            "id": op["id"],
            "year": op["year"],
            "parsed": {
                "date": op["date"],
                "document_type": op["document_type"],
                "requestor_name": "Test Requestor",
                "requestor_title": "City Attorney",
                "requestor_city": "Sacramento",
            },
            "sections": {
                "question": op["question"],
                "conclusion": op["conclusion"],
                "facts": "Test facts for this opinion.",
                "analysis": "Test analysis for this opinion.",
                "has_standard_format": True,
            },
            "citations": {
                "government_code": op["government_code_sections"],
                "regulations": op["regulations"],
                "prior_opinions": [],
                "cited_by": [],
            },
            "classification": {
                "topic_primary": op["topic_primary"],
                "topic_secondary": op["topic_secondary"],
                "topic_tags": [op["topic_primary"]],
            },
            "extraction": {"page_count": 3, "word_count": 1500},
            "local_pdf_path": None,
        }
        with open(file_path, "w") as f:
            json.dump(full_data, f)

        index.opinions[op["id"]] = {
            "opinion_number": op["id"],
            "date": op["date"],
            "year": op["year"],
            "question": op["question"],
            "conclusion": op["conclusion"],
            "topic_primary": op["topic_primary"],
            "topic_secondary": op["topic_secondary"],
            "government_code_sections": op["government_code_sections"],
            "regulations": op["regulations"],
            "prior_opinions": [],
            "cited_by": [],
            "document_type": op["document_type"],
            "file_path": file_path,
            "local_pdf_path": None,
        }

    index.topic_counts = {"conflicts_of_interest": 1, "lobbying": 1, "gifts": 1}
    index.statute_counts = {"87100": 1, "87103": 1, "86100": 1, "89503": 1}
    index.year_min = 2022
    index.year_max = 2024
    index.total_opinions = 3

    return index


@pytest.fixture()
def mock_engine():
    engine = MagicMock()
    engine.name.return_value = "MockEngine"
    engine.search.return_value = ["A-24-001", "I-23-045", "A-22-100"]
    return engine


@pytest.fixture()
def mock_metadata():
    return _build_test_metadata()


@pytest.fixture()
def client(mock_engine, mock_metadata):
    with patch("backend.main.CitationScoreFusion", return_value=mock_engine), \
         patch("backend.main.build_metadata_index", return_value=mock_metadata):
        from backend.main import app
        with TestClient(app) as tc:
            yield tc


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    rate_limiter.reset()
    yield
    rate_limiter.reset()
