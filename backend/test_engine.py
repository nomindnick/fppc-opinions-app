"""
Smoke test: instantiate the ported search engine and run 3 queries.
Verifies the port from fppc-opinions-search-lab didn't break anything.

Usage: python -m backend.test_engine   (from project root)
"""

import os
import sys
import time

# Ensure project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(override=True)

from backend.search.engine import CitationScoreFusion

TEST_QUERIES = [
    # Non-citation path (BM25 only)
    "can a board member vote on a project near their house",
    # Citation path (statute reference triggers score fusion)
    "Section 1090 subcontractor",
    # Citation path with regulation reference
    "disqualification Regulation 18702.2",
]


def main():
    print("=" * 60)
    print("FPPC Search Engine Port — Smoke Test")
    print("=" * 60)

    t0 = time.time()
    engine = CitationScoreFusion()
    load_time = time.time() - t0
    print(f"\nEngine loaded in {load_time:.1f}s\n")

    for i, query in enumerate(TEST_QUERIES, 1):
        print(f"--- Query {i}: {query}")
        t0 = time.time()
        results = engine.search(query, top_k=5)
        elapsed = time.time() - t0
        print(f"    Results ({elapsed:.3f}s): {results}")
        if not results:
            print("    WARNING: No results returned!")
        print()

    print("Smoke test complete.")


if __name__ == "__main__":
    main()
