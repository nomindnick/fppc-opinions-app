"""Rate limiting and request logging middleware."""

from __future__ import annotations

import logging
import time
from collections import defaultdict

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RateLimiter:
    """In-memory token bucket rate limiter, keyed by client IP.

    Args:
        capacity: Burst capacity (max tokens that can accumulate).
        refill_rate: Tokens added per second (steady-state throughput).
    """

    def __init__(self, capacity: int = 60, refill_rate: float = 1.0):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self._buckets: dict[str, tuple[float, float]] = defaultdict(
            lambda: (float(self.capacity), time.monotonic())
        )

    def allow(self, key: str) -> bool:
        tokens, last_time = self._buckets[key]
        now = time.monotonic()
        elapsed = now - last_time
        tokens = min(self.capacity, tokens + elapsed * self.refill_rate)
        if tokens >= 1.0:
            self._buckets[key] = (tokens - 1.0, now)
            return True
        self._buckets[key] = (tokens, now)
        return False

    def reset(self) -> None:
        self._buckets.clear()


rate_limiter = RateLimiter()


async def check_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.allow(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        t0 = time.monotonic()
        try:
            response = await call_next(request)
        except Exception:
            elapsed_ms = (time.monotonic() - t0) * 1000
            logger.info("%s %s 500 %.0fms", request.method, request.url.path, elapsed_ms)
            raise
        elapsed_ms = (time.monotonic() - t0) * 1000

        logger.info(
            "%s %s %d %.0fms",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        return response
