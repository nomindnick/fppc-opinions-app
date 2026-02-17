"""
Utility functions extracted from the search lab engines.

tokenize() — from bm25_full_text.py (experiment 001b)
parse_query_citations() — from bm25_citation_boost.py (experiment 004)
"""

import re

# ---------------------------------------------------------------------------
# Tokenization (from bm25_full_text.py)
# ---------------------------------------------------------------------------

# Stopwords — standard English set minus "not" and "no" which carry legal meaning
STOPWORDS = frozenset([
    "a", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by",
    "can", "could", "did", "do", "does", "doing", "done", "down", "during",
    "each", "few", "for", "from", "further", "get", "got", "had", "has",
    "have", "having", "he", "her", "here", "hers", "herself", "him",
    "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its",
    "itself", "just", "let", "may", "me", "might", "more", "most", "much",
    "must", "my", "myself", "nor", "of", "off", "on", "once", "only", "or",
    "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
    "same", "shall", "she", "should", "so", "some", "such", "than", "that",
    "the", "their", "theirs", "them", "themselves", "then", "there", "these",
    "they", "this", "those", "through", "to", "too", "under", "until", "up",
    "upon", "us", "very", "was", "we", "were", "what", "when", "where",
    "which", "while", "who", "whom", "why", "will", "with", "would", "yet",
    "you", "your", "yours", "yourself", "yourselves",
    "about", "above", "after", "again", "against", "all", "am", "any",
    "because", "before", "below", "between", "both", "also",
])

# Regex to merge parenthetical statute subsections: 87103(a) -> 87103a
_PAREN_SUB = re.compile(r"(\d+)\(([a-zA-Z0-9])\)")
# Regex to replace non-alphanumeric (except hyphens) with space
_NON_ALNUM = re.compile(r"[^a-z0-9\-]+")


def tokenize(text: str) -> list[str]:
    """Tokenize text for BM25 indexing/querying."""
    text = text.lower()
    text = _PAREN_SUB.sub(r"\1\2", text)
    text = _NON_ALNUM.sub(" ", text)
    tokens = text.split()
    return [t for t in tokens if t not in STOPWORDS]


# ---------------------------------------------------------------------------
# Citation parser (from bm25_citation_boost.py)
# ---------------------------------------------------------------------------

# Prefixed statute: "Section 87103(a)", "Government Code 1090", "Gov. Code 87100"
_RE_PREFIXED_STATUTE = re.compile(
    r"(?:Section|Gov(?:ernment)?\.?\s*Code)\s+"
    r"(\d{3,5})(\([a-zA-Z0-9]\))?",
    re.IGNORECASE,
)

# Prefixed regulation: "Regulation 18702.2", "Reg. 18703", "FPPC Reg 18700"
_RE_PREFIXED_REG = re.compile(
    r"(?:Reg(?:ulation)?\.?)\s+"
    r"(\d{4,5}(?:\.\d+)?)",
    re.IGNORECASE,
)

# Bare statute — known FPPC ranges only (to avoid false positives)
# 81000-91014 (Political Reform Act), 1090-1097 (Section 1090)
_RE_BARE_STATUTE = re.compile(
    r"\b(8[1-9]\d{3}|90\d{3}|91014|109[0-7])(?:\(([a-zA-Z0-9])\))?\b"
)

# Bare regulation — 18000-18999 range (Title 2, Division 6 regulations)
_RE_BARE_REG = re.compile(r"\b(18\d{3}(?:\.\d+)?)\b")


def parse_query_citations(query: str) -> dict:
    """Extract statute and regulation references from a query string.

    Returns:
        {
            "gov_code": [{"raw": "87103(a)", "base": "87103", "subsection": "(a)"}, ...],
            "regulations": [{"raw": "18702.2", "base": "18702", "subsection": ".2"}, ...]
        }
    """
    gov_code = []
    regulations = []
    seen_gc = set()
    seen_reg = set()

    # Prefixed statutes
    for m in _RE_PREFIXED_STATUTE.finditer(query):
        base = m.group(1)
        sub = m.group(2) or ""
        raw = base + sub
        if raw not in seen_gc:
            seen_gc.add(raw)
            gov_code.append({"raw": raw, "base": base, "subsection": sub})

    # Prefixed regulations
    for m in _RE_PREFIXED_REG.finditer(query):
        full = m.group(1)
        base = full.split(".")[0]
        sub = "." + full.split(".", 1)[1] if "." in full else ""
        if full not in seen_reg:
            seen_reg.add(full)
            regulations.append({"raw": full, "base": base, "subsection": sub})

    # Bare statutes (only if not already captured by prefixed)
    for m in _RE_BARE_STATUTE.finditer(query):
        base = m.group(1)
        sub_letter = m.group(2) or ""
        sub = f"({sub_letter})" if sub_letter else ""
        raw = base + sub
        if raw not in seen_gc:
            seen_gc.add(raw)
            gov_code.append({"raw": raw, "base": base, "subsection": sub})

    # Bare regulations (only if not already captured by prefixed)
    for m in _RE_BARE_REG.finditer(query):
        full = m.group(1)
        base = full.split(".")[0]
        sub = "." + full.split(".", 1)[1] if "." in full else ""
        if full not in seen_reg:
            seen_reg.add(full)
            regulations.append({"raw": full, "base": base, "subsection": sub})

    return {"gov_code": gov_code, "regulations": regulations}
