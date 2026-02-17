"""Pydantic request/response schemas for the FPPC Opinions API."""

from __future__ import annotations

from pydantic import BaseModel


class SearchResult(BaseModel):
    opinion_id: str
    opinion_number: str
    date: str | None
    year: int
    question: str | None
    conclusion: str | None
    topics: list[str]
    statutes: list[str]
    rank: int
    document_type: str | None


class SearchResponse(BaseModel):
    query: str
    total_results: int
    page: int
    per_page: int
    results: list[SearchResult]
    filters_applied: dict


class CitedOpinion(BaseModel):
    opinion_number: str
    exists_in_corpus: bool


class OpinionDetail(BaseModel):
    id: str
    opinion_number: str
    date: str | None
    year: int
    requestor_name: str | None
    requestor_title: str | None
    requestor_city: str | None
    document_type: str | None
    question: str | None
    conclusion: str | None
    facts: str | None
    analysis: str | None
    topic_primary: str | None
    topic_secondary: str | None
    topic_tags: list[str]
    government_code_sections: list[str]
    regulations: list[str]
    prior_opinions: list[CitedOpinion]
    cited_by: list[CitedOpinion]
    pdf_url: str | None
    page_count: int | None
    word_count: int | None
    has_standard_format: bool | None


class FilterOption(BaseModel):
    value: str
    label: str
    count: int


class FiltersResponse(BaseModel):
    topics: list[FilterOption]
    statutes: list[FilterOption]
    year_min: int
    year_max: int
    total_opinions: int
