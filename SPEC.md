# FPPC Opinions Search

## Overview

A public-facing web application for searching ~14,100 FPPC (Fair Political Practices Commission) advisory opinion letters spanning 1975–2025. The app replaces the FPPC's native search — which uses basic OR-logic full-text indexing — with a hybrid search engine that combines BM25 keyword retrieval, semantic embeddings, and citation-aware pooling to deliver significantly more relevant results. The structured opinion data (question, answer, facts, analysis) enables a results experience far superior to the FPPC's keyword-highlighted PDF excerpts.

## Problem Statement

California attorneys researching political reform law need to find relevant FPPC advisory opinions. The FPPC's search uses default OR logic (searching "conflict of interest voting" returns every document matching *any* of those words), produces noisy results, and only shows PDF excerpt snippets that make it hard to assess relevance. Attorneys waste time wading through irrelevant results and reading PDFs to determine if an opinion addresses their question.

This app provides a purpose-built search engine that understands the structure of FPPC opinions and the way attorneys actually research — by statute section, by topic, and by legal question — with results that show the actual question and answer so attorneys can assess relevance at a glance.

## Goals & Success Criteria

- **Primary:** Attorneys can find relevant FPPC opinions faster and more accurately than using the FPPC website
- **Measurable:** The search engine (experiment 009) achieves MRR 0.684 against a 65-query evaluation suite — the relevant opinion typically appears in the top 1-2 results
- **User experience:** The app should feel modern and polished — a clear step above the CMS-driven interfaces attorneys are accustomed to (Westlaw, FPPC website, county law library portals)
- **Operational:** Runs on Railway at minimal cost (<$10/month) with no authentication required for v1

## Target Users

California attorneys and legal professionals who research FPPC advisory opinions, primarily in the areas of conflicts of interest, campaign finance, gifts/honoraria, lobbying, and Government Code interpretation. Users are not technical but are accustomed to legal research interfaces (Westlaw, LexisNexis). They value precision, speed, and the ability to quickly assess whether a result is relevant to their question.

Initial audience is attorneys at Lozano Smith and peer firms. The app is public-facing with no login required.

## Core Features

### Hybrid Search

The search bar is the primary interface. Queries are processed by the experiment 009 citation-score-fusion engine, which routes queries through two paths:

- **Citation path:** Queries containing statute or regulation references (e.g., "Section 1090 subcontractor") are routed through a citation-aware pipeline that narrows candidates to opinions citing the relevant statute, then applies score fusion (BM25 + semantic embeddings) within that pool. A circuit breaker protects high-confidence BM25 results from semantic dilution.
- **Non-citation path:** General queries (e.g., "can a board member vote on a project near their house") go through pure BM25 on full text, which is fast and free of API calls.

The user does not see or control this routing — it happens automatically based on query content.

### Faceted Filters

Three optional filters narrow the search scope:

- **Topic filter:** Dropdown or pill selector for primary topic categories present in the corpus (conflicts of interest, campaign finance, gifts/honoraria, lobbying, etc.)
- **Statute section filter:** Input or dropdown for Government Code sections (e.g., "1090", "87100", "84308"). Leverages the existing citation index.
- **Date range filter:** Start year / end year selectors spanning 1975–2025.

Filters apply as AND conditions on top of the search query. If no query is entered, filters alone can browse the corpus.

### Results Display

Search results appear as cards showing:

- **Opinion number and date** (muted, secondary)
- **Question** (bold headline — the primary scan target)
- **Answer/Conclusion** (preview text, truncated)
- **Topic and statute tags** (small pills)

This is the app's key differentiator from the FPPC site. Attorneys can scan results and immediately assess relevance without opening each document.

### Opinion Detail View

Clicking a result opens a full, formatted view of the opinion:

- **Header:** Opinion number, date, topic, cited statutes
- **Sections:** Facts, Question, Analysis, Conclusion — each clearly delineated with good typography
- **Cited opinions:** Clickable links to other opinions referenced in this opinion (the "cited by" feature using the existing citation graph data in the JSON)
- **PDF download button:** Links to the original PDF hosted on Cloudflare R2

The detail view should feel like reading a well-typeset legal brief, not a raw text dump.

### PDF Access

Original opinion PDFs (~7GB total, ~14,100 files) are hosted on Cloudflare R2 (free tier: 10GB storage, zero egress fees). The app links to R2 URLs for downloads. PDFs are organized by opinion ID for simple URL mapping.

## Technical Architecture

### System Overview

Single-service architecture: a FastAPI backend serves both the REST API and the built React frontend as static files. This simplifies Railway deployment to one service.

```
┌─────────────────────────────────────────────────────┐
│                    Railway Service                    │
│                                                       │
│  ┌─────────────┐    ┌──────────────────────────────┐ │
│  │   FastAPI    │    │     React (built static)     │ │
│  │             │    │                              │ │
│  │  /api/search │◄──│  SearchPage                  │ │
│  │  /api/opinions│◄──│  OpinionPage                 │ │
│  │             │    │                              │ │
│  └──────┬──────┘    └──────────────────────────────┘ │
│         │                                             │
│  ┌──────▼──────┐                                     │
│  │   Search    │                                     │
│  │   Engine    │                                     │
│  │  (009 CSF)  │                                     │
│  └──────┬──────┘                                     │
│         │                                             │
│  ┌──────▼──────────────────────┐                     │
│  │  In-memory   │  Opinion JSON  │                    │
│  │  indexes     │  (14K files)   │                    │
│  └──────────────┴────────────────┘                     │
└─────────────────────────────────────────────────────┘
         │
         ▼ (PDF links + index download at startup)
┌──────────────────────┐
│    Cloudflare R2     │
│  (~7GB PDFs +        │
│   ~162MB indexes)    │
└──────────────────────┘
```

### Technology Stack

- **Backend:** Python 3.11+, FastAPI (async — important for non-blocking OpenAI embedding calls on the citation path)
- **Frontend:** React 18 with Vite build tooling
- **Styling:** Tailwind CSS for layout/utilities + custom CSS for typography
- **Fonts:** Inter (UI elements), a quality serif like Lora or Source Serif 4 (opinion body text)
- **Search engine:** Ported from `fppc-opinions-search-lab` repo, experiment 009 (citation_score_fusion.py)
- **Key Python dependencies:** `rank-bm25`, `openai`, `numpy`, `python-dotenv`, `fastapi`, `uvicorn`
- **Key JS dependencies:** `react`, `react-router-dom`, `tailwindcss`, `vite`
- **Static file hosting:** PDFs and pre-built search indexes on Cloudflare R2
- **Deployment:** Railway (single service)

### Data Model

No database. All data is file-based:

- **Opinion corpus:** ~14,100 JSON files in `data/extracted/{year}/{id}.json`. Each contains structured fields: `opinion_number`, `date`, `question`, `conclusion`, `facts`, `analysis`, `qa_text`, `full_text`, `topic_primary`, `topic_secondary`, `government_code_sections`, `prior_opinions`, and more.
- **Search indexes:** Three pre-built pickle files (~162MB total) hosted on Cloudflare R2 and downloaded at app startup: BM25 full-text index, OpenAI text-embedding-3-small qa_text embeddings, and citation index mapping statute sections to opinion IDs.
- **Metadata index:** At startup, the app loads a lightweight metadata index (opinion number, date, question, conclusion, topics, statutes) for fast results rendering without reading individual JSON files. This should be built as a startup task or pre-built artifact.

### Key Design Decisions

1. **No database:** The corpus is static (FPPC opinions don't change once published). File-based storage avoids database setup/cost and keeps deployment simple. A pre-built metadata index provides fast lookups.

2. **Single Railway service:** FastAPI serves both the API and the React build output. Avoids the complexity of coordinating two services and keeps the free/cheap tier viable.

3. **Cloudflare R2 for PDFs and indexes:** Railway's ephemeral filesystem can't reliably serve 7GB of static files. R2's zero-egress pricing and 10GB free tier make it the obvious choice. PDFs are immutable so caching is trivial. The pre-built search indexes (~162MB) are also stored on R2 alongside the PDFs, keeping the git repo small and using the same infrastructure.

4. **Pre-built indexes downloaded from R2 at startup:** The BM25 and embedding indexes are built once in the search lab and uploaded to Cloudflare R2. The app downloads them at startup and loads them into memory. This means zero index-build time on deploy, no OpenAI API calls for indexing in production, and no need for Git LFS or large files in the repo.

5. **No authentication for v1:** The app is public-facing. The only per-query API cost is one OpenAI embedding call for citation-path queries (~$0.0001 per query). At expected traffic levels (<100 queries/day), this is negligible. Auth can be added later if needed.

6. **React frontend over server-rendered templates:** The visual polish ceiling is higher with React. Smooth transitions, component-level loading states, and the ability to use animation libraries create a more impressive user experience — which matters for the goal of impressing colleagues.

## Constraints & Considerations

### Known Challenges

- **Startup time:** Downloading ~162MB of indexes from R2 plus building a metadata index from 14K JSON files will take several seconds. The app should handle this gracefully (health check endpoint that reports ready only after indexes are loaded, loading state on the frontend if the first request arrives before indexes are ready).
- **Railway ephemeral storage:** The JSON corpus needs to be part of the deployed image (included in the repo). Search indexes are downloaded from R2 at startup on each deploy. They won't persist across redeploys but the download adds only ~10-30 seconds to startup.
- **OpenAI API dependency:** Citation-path queries require an embedding API call. If OpenAI is down or the API key expires, the citation path fails. The engine should fall back gracefully to BM25-only for those queries rather than returning an error.

### Out of Scope for V1

- User authentication / login
- LLM-powered features (query expansion, opinion summarization, "ask a question about this opinion")
- Citation network visualization
- Saved searches or search history
- Admin interface for corpus management
- Full-text display of the original PDF content (the app shows the structured JSON data; the PDF is available for download)
- Mobile-native app (responsive web only)

### Security Considerations

- **OpenAI API key:** Stored as a Railway environment variable, never committed to the repo. The `.env` file is gitignored.
- **No user data:** The app stores no user data, requires no authentication, and has no database. The attack surface is minimal.
- **Rate limiting:** Consider basic rate limiting on the search endpoint (e.g., 60 requests/minute per IP) to prevent abuse of the OpenAI embedding calls. FastAPI middleware can handle this.

### Future Considerations

- **Authentication gate:** If traffic exceeds expectations, add a simple login (even just a shared password for firm access) to limit embedding API costs.
- **LLM-powered features:** Query expansion (HyDE) or cross-encoder re-ranking could improve the remaining zero-MRR queries, but at per-query inference cost.
- **Citation network explorer:** The citation graph data exists in the corpus. A visual explorer would be a compelling feature but is a separate project.
- **Corpus updates:** New FPPC opinions are published periodically. A future version could include a scraping/ingestion pipeline to update the corpus and rebuild indexes.
- **Search analytics:** Logging anonymized search queries would reveal what attorneys actually search for, informing future engine improvements.

---

## Design Direction

### Visual Identity

The app should feel authoritative and modern — not like a government CMS, not like a generic SaaS dashboard. Think of it as a specialist research tool designed by someone who understands how attorneys read.

- **Color palette:** Sophisticated warm neutrals. Off-white/cream background (`#FAFAF8` or similar), warm dark gray for text (`#1a1a1a`), one accent color for interactive elements (a muted teal or deep blue — authoritative without being "law firm navy"). Avoid pure white backgrounds and pure black text.
- **Typography:** Inter or similar clean sans-serif for UI chrome (nav, filters, buttons, metadata). A quality serif (Lora, Source Serif 4, or Merriweather) for opinion body text in the detail view. Generous line height (1.6-1.7) for readability in the opinion view.
- **Layout:** Generous whitespace. The search page should breathe. Results cards should have clear separation. The opinion detail view should have comfortable reading width (max ~720px for the text column).
- **Interaction:** Subtle transitions on search results appearing, smooth page transitions between search and detail views. Loading states should feel intentional (skeleton screens or subtle spinners, not blank screens). No flashy animations — the polish should feel quiet and confident.

### Key Screens

1. **Home/Search:** Centered search bar (prominent, inviting), filter controls below or beside it, clean branding. When there are no results yet, the page can show corpus stats or a brief description of what this tool is.
2. **Results:** Card list with clear visual hierarchy. Each card: opinion number + date (small, muted) → question (bold, primary) → conclusion preview (regular weight, truncated) → topic/statute pills (small, colored). Pagination or infinite scroll.
3. **Opinion Detail:** Full opinion rendered with beautiful typography. Sticky header or breadcrumb with opinion number. Sections (Facts, Question, Analysis, Conclusion) with clear headings. Sidebar or top bar with metadata, PDF download, and cited opinions as links.

---

## Notes for Claude Code

### Search Engine Integration

The search engine is being ported from the `fppc-opinions-search-lab` repo. The key files are:

- `src/interface.py` — SearchEngine abstract base class
- `src/engines/citation_score_fusion.py` — The main engine (experiment 009)
- `src/engines/bm25_full_text.py` — Contains `tokenize()` utility function
- `src/engines/bm25_citation_boost.py` — Contains `parse_query_citations()` utility function

The engine is instantiated with `corpus_path` and `index_dir` arguments. It loads three pickle index files on init. The primary method is `search(query: str, top_k: int = 20) -> List[Dict]` which returns ranked results with opinion IDs and scores.

For the app, these files should be reorganized into a clean `backend/search/` package. Helper functions from the BM25 engine files should be extracted into a shared utils module rather than importing across engine files. The engine itself should remain self-contained and minimally modified from the lab version — it's been validated against the eval suite and unnecessary changes risk regressions.

### Pre-built Indexes

Three pickle files must be available at the paths the engine expects:
- `indexes/BM25FullText_index.pkl` (~74MB)
- `indexes/embeddings_text-embedding-3-small_qa_text.pkl` (~87MB)
- `indexes/BM25CitationBoost_citation_index.pkl` (~784KB)

These are hosted on Cloudflare R2 (same bucket/infrastructure as the PDFs) and downloaded to the local `indexes/` directory at app startup. They are gitignored — the repo stays small and R2 is the single source of truth for both PDFs and indexes.

### Metadata Index

The app needs fast access to opinion metadata (number, date, question, conclusion, topics, statutes) for rendering search results without reading 14K individual JSON files. Build a metadata index at app startup (or pre-build it as a JSON/pickle artifact). This is a simple dict mapping opinion IDs to their metadata fields.

### Frontend Build & Serving

The React app is built with Vite. The production build outputs to a directory (e.g., `frontend/dist/`). FastAPI serves these static files and falls back to `index.html` for client-side routing. During development, Vite's dev server proxies API requests to the FastAPI backend.

### Environment Variables

- `OPENAI_API_KEY` — Required for citation-path embedding queries
- `R2_PDF_BASE_URL` — Base URL for Cloudflare R2 PDF bucket (e.g., `https://fppc-pdfs.r2.dev`)
- `R2_INDEX_BASE_URL` — Base URL for downloading search index pickle files from R2 (may be the same bucket as PDFs with an `/indexes/` prefix, or a separate bucket)
- `PORT` — Railway sets this automatically
- `ENV` — `development` or `production` (controls static file serving behavior)

### Coding Preferences

- Python: Use type hints throughout. Async endpoints in FastAPI. Pydantic models for API request/response schemas.
- React: Functional components with hooks. React Router for navigation. Keep components focused and composable.
- CSS: Tailwind for layout and utilities. Custom CSS only for typography and things Tailwind can't express well.
- Error handling: The search engine should never crash the app. If OpenAI is unavailable, fall back to BM25-only. If a JSON file is malformed, skip it gracefully.
- Testing: Backend API tests with pytest + httpx. Frontend can skip tests for v1 — the visual output is the test.
