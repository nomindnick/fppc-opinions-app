"""Tests for Sprint 2.2: error handling, rate limiting, and structured responses."""

from __future__ import annotations


def test_search_returns_results(client):
    resp = client.get("/api/search?q=conflict+of+interest")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_results"] > 0
    assert len(data["results"]) > 0
    assert data["query"] == "conflict of interest"


def test_search_empty_query(client):
    resp = client.get("/api/search?q=")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_results"] == 0
    assert data["results"] == []


def test_search_invalid_page(client):
    resp = client.get("/api/search?q=test&page=abc")
    assert resp.status_code == 422
    data = resp.json()
    assert data["error"] == "Validation error"
    assert data["detail"] is not None


def test_search_engine_error_returns_empty(client, mock_engine):
    mock_engine.search.side_effect = RuntimeError("Engine crashed")
    resp = client.get("/api/search?q=conflict")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_results"] == 0
    assert data["results"] == []


def test_opinion_found(client):
    resp = client.get("/api/opinions/A-24-001")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "A-24-001"
    assert data["opinion_number"] == "A-24-001"
    assert data["year"] == 2024
    assert data["question"] is not None
    assert data["conclusion"] is not None
    assert data["facts"] is not None
    assert data["analysis"] is not None


def test_opinion_not_found(client):
    resp = client.get("/api/opinions/NONEXISTENT")
    assert resp.status_code == 404
    data = resp.json()
    assert data["error"] == "Opinion not found"


def test_opinion_file_read_error(client, mock_metadata):
    # Point the file_path to a nonexistent file to trigger OSError
    mock_metadata.opinions["A-24-001"]["file_path"] = "/tmp/nonexistent_opinion.json"
    resp = client.get("/api/opinions/A-24-001")
    assert resp.status_code == 500
    data = resp.json()
    assert data["error"] == "Failed to load opinion data"


def test_rate_limit_exceeded(client):
    for _ in range(60):
        resp = client.get("/api/search?q=test")
        assert resp.status_code == 200

    resp = client.get("/api/search?q=test")
    assert resp.status_code == 429
    data = resp.json()
    assert data["error"] == "Rate limit exceeded"


def test_rate_limit_search_only(client):
    # Health endpoint is not rate-limited
    for _ in range(70):
        resp = client.get("/api/health")
        assert resp.status_code == 200


def test_health_endpoint(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["engine_loaded"] is True
    assert data["engine_name"] == "MockEngine"
    assert data["opinions_indexed"] == 3


def test_search_filter_single_topic(client):
    resp = client.get("/api/search?q=test&topic=conflicts_of_interest")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_results"] == 1
    assert data["results"][0]["opinion_id"] == "A-24-001"
    assert data["filters_applied"]["topic"] == ["conflicts_of_interest"]


def test_search_filter_multi_topic(client):
    resp = client.get("/api/search?q=test&topic=conflicts_of_interest&topic=gifts")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_results"] == 2
    ids = {r["opinion_id"] for r in data["results"]}
    assert ids == {"A-24-001", "A-22-100"}
    assert len(data["filters_applied"]["topic"]) == 2


def test_filters_endpoint(client):
    resp = client.get("/api/filters")
    assert resp.status_code == 200
    data = resp.json()
    assert "topics" in data
    assert "statutes" in data
    assert data["year_min"] == 2022
    assert data["year_max"] == 2024
    assert data["total_opinions"] == 3
