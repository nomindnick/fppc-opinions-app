"""GET /api/filters — pre-computed filter aggregations."""

from fastapi import APIRouter, Request

from backend.models import FilterOption, FiltersResponse

router = APIRouter(prefix="/api", tags=["filters"])


@router.get("/filters", response_model=FiltersResponse)
async def get_filters(request: Request):
    metadata = request.app.state.metadata

    # Topics: sorted by count desc, exclude None, human-readable labels
    topics = [
        FilterOption(
            value=topic,
            label=topic.replace("_", " ").title(),
            count=count,
        )
        for topic, count in sorted(
            metadata.topic_counts.items(), key=lambda x: x[1], reverse=True
        )
    ]

    # Statutes: sorted by count desc, "Section" prefix label
    statutes = [
        FilterOption(
            value=statute,
            label=f"Section {statute}",
            count=count,
        )
        for statute, count in sorted(
            metadata.statute_counts.items(), key=lambda x: x[1], reverse=True
        )
    ]

    return FiltersResponse(
        topics=topics,
        statutes=statutes,
        year_min=metadata.year_min,
        year_max=metadata.year_max,
        total_opinions=metadata.total_opinions,
    )
