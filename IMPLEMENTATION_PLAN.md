# Implementation Plan: FPPC Opinions Search

> **Reference:** See [SPEC.md](./SPEC.md) for full project context, architecture decisions, and feature details.

## Overview

The implementation is organized into five phases: foundation and search engine integration, backend API, frontend core, design polish, and deployment. Each sprint is scoped to ~1-2 hours of Claude Code work. The search engine is already built and validated — the primary engineering work is building the web application around it.

**Estimated Total Time:** 14-18 hours across 10 sprints

---

## Phase 1: Foundation

**Goal:** Project scaffolding, search engine ported and loading, FastAPI serving a basic health check, React app rendering a hello world. Everything wired together.

### Sprint 1.1: Project Scaffolding & Search Engine Port
**Estimated Time:** 1-2 hours

**Objective:** Set up the monorepo structure, port the search engine from the search lab, and verify it initializes and runs a query.

**Tasks:**
- [x] Create project directory structure:
  ```
  fppc-opinions/
  ├── backend/
  │   ├── main.py
  │   ├── requirements.txt
  │   ├── search/
  │   │   ├── __init__.py
  │   │   ├── interface.py      (from src/interface.py)
  │   │   ├── engine.py         (from src/engines/citation_score_fusion.py)
  │   │   └── utils.py          (tokenize from bm25_full_text.py,
  │   │                          parse_query_citations from bm25_citation_boost.py)
  │   ├── routers/
  │   │   └── __init__.py
  │   └── config.py             (settings via pydantic-settings / env vars)
  ├── frontend/
  │   └── (empty for now)
  ├── data/
  │   └── extracted/            (opinion JSON corpus — gitignored, symlinked or copied)
  ├── indexes/                  (pre-built pickle files — gitignored, downloaded from R2 at startup)
  ├── .env.example
  ├── .gitignore
  ├── SPEC.md
  └── IMPLEMENTATION_PLAN.md
  ```
- [x] Port search engine files: copy `interface.py` as-is, refactor `citation_score_fusion.py` into `engine.py` with imports adjusted to pull `tokenize()` and `parse_query_citations()` from the new `utils.py` instead of sibling engine files
- [x] Update engine constructor defaults to match new directory layout (`corpus_path="data/extracted"`, `index_dir="indexes"`)
- [x] Create `requirements.txt` with: `fastapi`, `uvicorn[standard]`, `rank-bm25`, `openai`, `numpy`, `python-dotenv`, `pydantic-settings`, `httpx` (for testing)
- [x] Create minimal `main.py`: FastAPI app with a `/health` endpoint that reports whether the search engine is loaded
- [x] Write a `backend/test_engine.py` script that instantiates the engine and runs 3 test queries, printing results to stdout — verifies the port didn't break anything

**Acceptance Criteria:**
- `python backend/test_engine.py` runs 3 queries and returns ranked results matching expected output from the search lab
- `uvicorn backend.main:app` starts and `/health` returns `{"status": "ok", "engine_loaded": true}`
- No import errors; all search engine dependencies resolve

**Sprint Update:**
> - Engine ported from experiment 009 with minimal modifications
> - Path computation uses `os.path.dirname` chain from `__file__` for absolute paths to indexes — avoids breaking when the working directory differs from the project root
> - OpenAI API key read from centralized `config.settings` (pydantic-settings) rather than module-level `load_dotenv()` — prevents `.env` from overwriting Railway production env vars
> - All three index files present locally (155MB total): BM25 full-text (71M), embeddings (83M), citation index (768K)
> - Index files and `data/extracted/` are gitignored; 14,096 opinion JSON files confirmed present
> - Evaluation dataset (65 queries) included in `eval/dataset.json`
> - Indexes are gitignored and will be hosted on Cloudflare R2 (same infrastructure as PDFs). The app will download them at startup. Upload script and startup download logic to be implemented in Sprint 5.2.

---

### Sprint 1.2: React App Scaffolding & Dev Workflow
**Estimated Time:** 1 hour

**Objective:** Initialize the React frontend with Vite, configure Tailwind CSS, set up the dev proxy to the FastAPI backend, and verify the full-stack dev workflow.

**Tasks:**
- [x] Initialize React app in `frontend/` using Vite: `npm create vite@latest frontend -- --template react`
- [x] Install and configure Tailwind CSS (follow Vite + Tailwind docs)
- [x] Install `react-router-dom` for client-side routing
- [x] Configure Vite dev server to proxy `/api/*` requests to `http://localhost:8000` (the FastAPI backend)
- [x] Create minimal app structure:
  ```
  frontend/src/
  ├── App.jsx            (router with two placeholder routes: / and /opinion/:id)
  ├── main.jsx
  ├── index.css          (Tailwind directives + custom font imports)
  ├── pages/
  │   ├── SearchPage.jsx   (placeholder)
  │   └── OpinionPage.jsx  (placeholder)
  └── components/
      └── Layout.jsx       (shared layout wrapper)
  ```
- [x] Add Google Fonts: Inter (sans-serif) and Lora or Source Serif 4 (serif) via CSS import or `<link>` tag
- [x] Configure Tailwind `theme.extend` with the custom font families and color palette from the SPEC (warm neutrals, accent color)
- [x] Verify full-stack dev workflow: start FastAPI (`uvicorn backend.main:app --reload`), start Vite (`cd frontend && npm run dev`), confirm the React app loads and can hit the `/health` endpoint through the proxy

**Acceptance Criteria:**
- `npm run dev` serves the React app with hot reload
- The React app successfully calls `/api/health` through the Vite proxy and displays the response
- Tailwind classes work (test with a styled div)
- Both fonts load correctly
- React Router navigates between the two placeholder pages

**Sprint Update:**
> - Scaffolded with Vite + React 19 (latest from `create-vite` template)
> - Tailwind CSS v4 used instead of v3 — uses `@tailwindcss/vite` plugin and `@theme` block in CSS rather than `tailwind.config.js` / `theme.extend`. No `postcss.config.js` needed.
> - Source Serif 4 chosen as the serif font (user confirmed). Loaded via Google Fonts CSS `@import` in `index.css` alongside Inter.
> - Design tokens defined as CSS custom properties in `@theme`: warm neutral palette (`#FAFAF8` bg, warm grays), muted teal accent (`#2B6B5E`)
> - Vite dev proxy configured: `/api` → `localhost:8000`
> - Placeholder SearchPage fetches `/api/health` to verify full-stack connectivity through the proxy
> - `npm run build` produces `frontend/dist/` cleanly (231KB JS + 9KB CSS gzipped)

---

## Phase 2: Backend API

**Goal:** Complete REST API that the frontend can consume. Search endpoint, opinion detail endpoint, filter support, and a pre-built metadata index for fast results rendering.

### Sprint 2.1: Metadata Index & Search API Endpoint
**Estimated Time:** 1-2 hours

**Objective:** Build a metadata index for fast results rendering, create the search API endpoint, and create the opinion detail endpoint.

**Tasks:**
- [x] Create `backend/metadata.py`: On startup, iterate all opinion JSON files and build an in-memory dict mapping opinion ID → `{opinion_number, date, question, conclusion, topic_primary, topic_secondary, government_code_sections, prior_opinions, year, file_path}`. Log the build time. Consider pre-building this as a pickle/JSON artifact if startup time exceeds 10 seconds.
- [x] Create Pydantic response models in `backend/models.py`:
  - `SearchResult`: opinion_id, opinion_number, date, question, conclusion (truncated to ~300 chars), topics (list), statutes (list), relevance_score
  - `SearchResponse`: query, total_results, results (list of SearchResult), filters_applied
  - `OpinionDetail`: all structured fields from the JSON, plus a `pdf_url` field constructed from the R2 base URL, plus `cited_opinions` as a list of {opinion_number, opinion_id} for clickable links
- [x] Create `backend/routers/search.py`:
  - `GET /api/search?q=...&topic=...&statute=...&year_start=...&year_end=...&page=1&per_page=20`
  - Calls the search engine with the query, then applies post-hoc filters (topic, statute, date range) on the results
  - Returns paginated `SearchResponse`
  - If `q` is empty, return an empty result set (browse-without-query deferred to v2)
- [x] Create `backend/routers/opinions.py`:
  - `GET /api/opinions/{opinion_id}` — loads the full JSON file and returns `OpinionDetail`
  - Handle 404 gracefully if opinion ID doesn't exist
- [x] Create `backend/routers/filters.py`:
  - `GET /api/filters` — returns available filter values: list of topics (with counts), list of statute sections (with counts), year range. Built from the metadata index.
- [x] Wire all routers into `main.py`

**Acceptance Criteria:**
- `GET /api/search?q=conflict+of+interest` returns a well-structured JSON response with ranked results including question/conclusion previews
- `GET /api/search?q=section+1090&topic=conflicts` returns results filtered to conflicts of interest topic
- `GET /api/opinions/{valid_id}` returns the full opinion data
- `GET /api/opinions/nonexistent` returns 404
- `GET /api/filters` returns topics, statutes, and year range
- API responses are fast: search < 2 seconds, opinion detail < 200ms, filters < 200ms

**Sprint Update:**
> - Metadata index walks ~14K JSON files at startup in ~1.2s — well under the 10s threshold, no pickle pre-build needed
> - `MetadataIndex` dataclass holds opinions dict, pre-computed topic/statute counts (via Counter), and year range for instant `/api/filters` responses
> - Question/conclusion use fallback logic: `sections.question` → `sections.question_synthetic` for older opinions with poor OCR
> - Search uses over-fetch strategy: `engine.search(query, top_k=200)` then post-hoc AND filtering (topic, statute, year range), then paginate. 200 is generous enough that filtering rarely exhausts the pool.
> - Engine returns only IDs (no scores), so results include a 1-based `rank` field instead of `relevance_score`
> - Conclusions truncated to ~300 chars at last word boundary in search results
> - Opinion detail constructs R2 PDF URLs with `urllib.parse.quote(path, safe='/')` for filenames with spaces/parens; falls back to FPPC website URL
> - `CitedOpinion` model includes `exists_in_corpus` flag checked against metadata index for prior_opinions and cited_by
> - Refactored `main.py`: replaced module-level `engine` global with `app.state.engine` + `app.state.metadata`; routers access via `request.app.state`
> - `get_opinion` endpoint uses plain `def` (not `async def`) so FastAPI runs the synchronous file I/O in a threadpool automatically
> - 14,095 opinions indexed (one fewer than the 14,096 in Sprint 1.1 notes — likely a malformed file skipped by the try/except)
> - Corpus stats: 5 topics (conflicts_of_interest: 6,797, campaign_finance: 2,395, other: 1,064, gifts_honoraria: 764, lobbying: 180), 2,896 uncategorized, 1,207 unique statute sections, years 1975–2025

---

### Sprint 2.2: Error Handling, Rate Limiting & OpenAI Fallback
**Estimated Time:** 1 hour

**Objective:** Production-harden the API with graceful error handling, rate limiting on the search endpoint, and automatic BM25 fallback when OpenAI is unavailable.

**Tasks:**
- [x] Add OpenAI fallback to the search engine: wrap the embedding call in a try/except. If it fails (timeout, auth error, rate limit), log a warning and fall back to BM25-only results for that query. The user should never see a 500 error because OpenAI is down.
- [x] Add basic rate limiting middleware to FastAPI: 60 requests/minute per IP on the `/api/search` endpoint. Use a simple in-memory token bucket (no Redis needed at this scale). Return 429 with a clear message if exceeded.
- [x] Add structured error responses: all API errors return `{"error": "message", "detail": "..."}` with appropriate HTTP status codes
- [x] Add request logging: log each search query (anonymized — no IP) with response time and result count, for future analytics
- [x] Add a startup event that logs engine load time, corpus size, and index sizes
- [x] Test error scenarios: invalid query params, missing opinion ID, simulated OpenAI failure

**Acceptance Criteria:**
- Simulating OpenAI failure (bad API key) still returns search results (BM25-only) with no 500 error
- Sending >60 requests/minute to search returns 429 on excess requests
- All error responses follow the consistent JSON error format
- Startup logs show engine initialization details

**Sprint Update:**
> - OpenAI fallback already existed inside `engine.py` (lines 179-188) — no engine modifications needed. Router-level try/except added around `engine.search()` for graceful degradation on unexpected errors (returns 0 results instead of 500).
> - Token bucket rate limiter: capacity=60 burst, 1 token/sec refill, keyed by client IP. Applied only to `/api/search` via FastAPI `Depends()`. Returns 429 with structured error.
> - Three exception handlers registered: `StarletteHTTPException` (normalizes all HTTP errors), `RequestValidationError` (readable 422 for bad params like `?page=abc`), catch-all `Exception` (logs traceback, returns generic 500 — no traceback leaked).
> - `RequestLoggingMiddleware` (BaseHTTPMiddleware) logs `METHOD /path STATUS elapsed_ms` for all `/api/` routes. Search endpoint additionally logs query, result count, and timing.
> - Converted deprecated `@app.on_event("startup")` to `lifespan` async context manager. Startup logs: engine name, corpus stats (opinion count, topic/statute counts, year range), OpenAI availability, total startup time.
> - `ErrorResponse` Pydantic model added (`error: str, detail: str | None`).
> - 11 pytest tests in `backend/tests/test_api.py` with shared fixtures in `conftest.py`: mock engine, mock metadata backed by temp JSON files, autouse rate limiter reset. Covers search results, empty query, invalid params (422), engine error degradation, opinion found/not found/file error, rate limiting, health, and filters.
> - Code review fixes: use `engine._openai_available` instead of private `_client`, stringify `exc.detail` for non-string safety, wrap `call_next` in try-except in logging middleware, restore over-fetch comment, clarify rate limiter docstring.

---

## Phase 3: Frontend Core

**Goal:** Fully functional search interface, results display, and opinion detail view. Focus on structure and functionality first — visual polish comes in Phase 4.

### Sprint 3.1: Search Page — Search Bar & Results
**Estimated Time:** 2 hours

**Objective:** Build the search page with a functional search bar and results list displaying opinion cards with question/answer previews.

**Tasks:**
- [x] Build `SearchBar` component: text input with search icon, debounced (300ms) or submit-on-enter. The query should be reflected in the URL as a query parameter (`?q=...`) so searches are bookmarkable/shareable.
- [x] Build `ResultCard` component displaying:
  - Opinion number + date (small, muted text, top line)
  - Question (bold, primary text — the main thing attorneys scan)
  - Conclusion/answer preview (regular weight, truncated to ~2-3 lines with ellipsis)
  - Topic and statute pills/tags (small, subtle colored badges)
  - Entire card is clickable, navigates to `/opinion/{id}`
- [x] Build `ResultsList` component: renders list of `ResultCard` components, handles empty state ("No results found" with helpful message), handles loading state (skeleton cards)
- [x] Build `Pagination` component: page numbers or prev/next with current page indicator. Syncs with URL params (`?page=2`)
- [x] Wire `SearchPage` together: on mount (or URL change), read query params, call `/api/search`, display results
- [x] Handle the initial empty state (no query yet): show a welcome message with corpus description, total opinion count, and perhaps a few example queries attorneys can click to try

**Acceptance Criteria:**
- Typing a query and pressing Enter (or after debounce) fetches results and displays them as cards
- Results show question, conclusion preview, opinion number, date, and topic/statute tags
- Clicking a result card navigates to `/opinion/{id}`
- The URL updates with query params; refreshing the page re-executes the search
- Empty state (no query) shows a welcoming landing view
- Loading state shows skeleton cards while waiting for results
- No-results state shows a helpful message

**Sprint Update:**
> - Submit-on-enter chosen over debounce — avoids unnecessary API calls during typing and feels more intentional for legal research workflows.
> - `useSearchParams()` is the single source of truth for `q` and `page` — URL is always bookmarkable/shareable, browser back/forward works natively.
> - `SearchBar` syncs input from URL state via `useEffect` (handles example query clicks and back/forward navigation).
> - `ResultCard` uses serif font (`Source Serif 4`) for the question field to visually distinguish opinion content from UI chrome. Handles `question: null` on older opinions by falling back to conclusion as primary text. Statute pills capped at 3 with "+N more" overflow.
> - `ResultsList` has three render states: 5 skeleton cards (`animate-pulse`), no-results message with search suggestions, or result card list.
> - `Pagination` uses ellipsis windowing (current ±1, always show first/last) for large result sets. Hidden when single page.
> - `SearchLanding` fetches total opinion count from `/api/filters` on mount. Two example query pills: one statutory/keyword, one natural language.
> - `AbortController` in the search effect prevents race conditions on rapid query/page changes. Cleanup function aborts in-flight requests.
> - API params built with `URLSearchParams` object — easy to extend with filter params in Sprint 3.2.

---

### Sprint 3.2: Filters UI
**Estimated Time:** 1-2 hours

**Objective:** Add topic, statute, and date range filters to the search page, synced with URL parameters and the backend API.

**Tasks:**
- [x] Build `TopicFilter` component: dropdown or set of clickable pills showing available topics. Loads options from `/api/filters`. Single-select or multi-select (decide based on what feels natural — single-select is simpler and probably sufficient).
- [x] Build `StatuteFilter` component: text input with autocomplete/suggestions from the available statute sections in the filters endpoint. Attorneys should be able to type "1090" and see matching sections.
- [x] Build `DateRangeFilter` component: two dropdown selects (start year, end year) spanning the corpus range. Defaults to full range.
- [x] Build `FilterBar` component: composes the three filters in a horizontal row (desktop) or stacked (mobile). Include a "Clear all filters" action.
- [x] Integrate filters with search: filter values are synced to URL params (`?topic=conflicts&statute=1090&year_start=2010`). Changing a filter re-triggers the search API call with the new parameters.
- [x] Integrate with `SearchPage`: filters appear below the search bar. Results update when filters change.

**Acceptance Criteria:**
- Selecting a topic filter narrows search results to that topic
- Typing a statute section shows matching suggestions and filters results
- Setting a date range excludes opinions outside that range
- All filter values are reflected in the URL; refreshing preserves filters
- "Clear all" resets filters and shows unfiltered results
- Filters require an active search query (browse-without-query deferred to v2)

**Sprint Update:**
> - Three filter components: `TopicFilter` (native `<select>` for ~5 topic categories with counts), `StatuteFilter` (custom combobox with autocomplete over ~1,207 statutes, keyboard navigation, ARIA roles, click-outside-to-close), `DateRangeFilter` (two year `<select>` dropdowns with cross-validation).
> - `FilterBar` composes all three with responsive layout and "Clear filters" button. Collapses behind a toggle button with active-filter count badge on mobile.
> - `SearchPage` updated with `buildParams()` helper that preserves all active filters across search, pagination, and filter changes while always resetting to page 1 on filter change.
> - All filter state lives in URL params (`?topic=...&statute=...&year_start=...&year_end=...`) for bookmarkability and back/forward support.
> - `ResultsList` shows filter-aware empty state messaging.
> - Follow-up: Topic filter converted from single-select dropdown to multi-select checkbox dropdown. Backend updated to accept repeated `topic` query params with AND filtering. Tests added for single and multi-topic search.

---

### Sprint 3.3: Opinion Detail Page
**Estimated Time:** 1-2 hours

**Objective:** Build the full opinion detail view with formatted sections, cited opinion links, and PDF download.

**Tasks:**
- [x] Build `OpinionHeader` component: opinion number, date, topic tags, statute tags. Prominent but not overwhelming.
- [x] Build `OpinionBody` component: renders Facts, Question, Analysis, and Conclusion sections with clear section headings. Use the serif font for body text. Handle cases where some sections may be empty/missing in the JSON.
- [x] Build `CitedOpinions` component: list of opinions cited by this one (from the `prior_opinions` field in the JSON). Each is a clickable link to `/opinion/{id}` if that opinion exists in the corpus. Show opinion number as the link text. If the cited opinion isn't in the corpus (e.g., it references an opinion not in the dataset), show it as plain text.
- [x] Build `PdfDownloadButton` component: prominent button that links to the R2 PDF URL. Opens in new tab. Include a PDF icon.
- [x] Build `OpinionPage`: fetches opinion data from `/api/opinions/{id}`, composes the above components. Handle loading state (skeleton) and 404 (opinion not found page).
- [x] Add a "Back to results" link/button that returns to the search results page (preserving the previous query and filters via URL params)
- [x] Reading experience: set max-width on the text column (~720px), generous line-height, comfortable font size for the body text

**Acceptance Criteria:**
- Navigating to `/opinion/{valid_id}` shows the full formatted opinion
- All sections (Facts, Question, Analysis, Conclusion) render with clear headings
- Cited opinions appear as clickable links that navigate to the cited opinion's detail page
- PDF download button opens the correct PDF in a new tab (using the R2 URL pattern)
- "Back to results" returns to the search page with previous query/filters intact
- 404 page shows for invalid opinion IDs
- Opinion body text uses serif font with comfortable reading layout

**Sprint Update:**
> - Three new components: `OpinionHeader` (metadata, topic/statute pills, PDF download button), `OpinionBody` (Question → Facts → Analysis → Conclusion sections), `OpinionSidebar` (citation graph with in-corpus links + document metadata).
> - `CitedOpinions` implemented as part of `OpinionSidebar` rather than a standalone component — sidebar card shows "Cites" (prior_opinions) and "Cited By" lists. In-corpus opinions render as clickable `<Link>` in accent color; out-of-corpus as muted plain text.
> - PDF download button integrated into `OpinionHeader` (top-right on desktop) rather than a separate component — cleaner layout.
> - `OpinionPage` fully rewritten: `useEffect` with `AbortController` cleanup, four states (loading skeleton, 404, error, success), two-column responsive layout (`flex-1 max-w-[720px]` main + `w-72 sticky` sidebar).
> - Back navigation uses `navigate(-1)` (browser history) to preserve search query and filters when returning from an opinion.
> - Shared utilities extracted: `formatDate` and `formatTopic` moved from `ResultCard.jsx` to `utils.js` for reuse in `OpinionHeader`.
> - Legal typography via custom CSS in `index.css`: Source Serif 4 at 17px, 1.72 line-height, OpenType features (kerning, ligatures, oldstyle numerals), `text-rendering: optimizeLegibility`. Section breaks use hairline rules (law-review style). Section headings are quiet 11px letterspaced uppercase labels in Inter.
> - Null-safe throughout: all fields except `opinion_number` and `year` can be null. Sections, requestor, topics, statutes, citations, PDF button all gracefully omit when data is missing. OCR disclaimer shown when `has_standard_format === false`.
> - Bug fix during code review: `opinion-section-first` class was applied by SECTIONS array index, not rendered index — caused unwanted top border when `question` was null (~20% of opinions). Fixed by filtering to present sections before mapping.

---

## Phase 4: Design & Polish

**Goal:** Transform the functional app into something visually impressive. This is where the app goes from "it works" to "wait, you built this?"

### Sprint 4.1: Visual Design System & Typography
**Estimated Time:** 2 hours

**Objective:** Implement the complete visual design system: color palette, typography scale, component styling, and overall layout polish.

**Tasks:**
- [x] Implement color palette across the app:
  - Background: warm off-white (`#FAFAF8` or similar)
  - Primary text: warm dark gray (not pure black)
  - Secondary/muted text: medium gray
  - Accent color: muted teal or deep blue for interactive elements (links, buttons, active filters)
  - Subtle borders and dividers using light warm grays
  - Result card backgrounds: white with subtle shadow or border
- [x] Typography system:
  - Sans-serif (Inter) for: navigation, filters, buttons, metadata, opinion number/date, tags
  - Serif (Lora/Source Serif 4) for: opinion body text in the detail view, question text in result cards
  - Establish a type scale: consistent heading sizes, body sizes, caption sizes
  - Line heights: 1.5 for UI text, 1.7 for opinion body reading text
- [x] Search bar styling: make it the hero element on the landing page. Generous padding, subtle shadow or border, rounded corners. Search icon inside the input.
- [x] Result card styling: clean card design with clear visual hierarchy. Question text should be the dominant visual element. Subtle hover state. Tags should be small pills with muted colored backgrounds.
- [x] Filter bar styling: clean, unobtrusive. Filters should feel like refinement tools, not a complex form.
- [x] Overall layout: generous whitespace throughout. Content max-width on large screens. The app should feel spacious, not cramped.
- [x] Header/navigation: minimal. App name/logo (text is fine — "FPPC Opinions" in a nice weight), maybe a subtle tagline. No complex nav — there are only two pages.

**Acceptance Criteria:**
- The app has a cohesive, professional visual identity
- Typography is consistent — no mismatched fonts, sizes, or weights
- Color palette is consistent — no default browser blues or random grays
- The search page feels inviting and clean
- Result cards have clear visual hierarchy (question is dominant, metadata is secondary)
- The opinion detail view is a pleasure to read
- The overall impression is "this was designed by someone who cares"

**Sprint Update:**
> - Design tokens added to `index.css` `@theme` block: `--color-border-light: #EDEBE6` (lighter card borders) and `--color-text-heading: #1A1A18` (deeper heading color).
> - New CSS utility classes: `.card-shadow` / `.card-shadow:hover` (layered box-shadow system replacing border-dominant cards), `.search-input` / `.search-input:focus` (hero search bar shadow that deepens on focus), `.dropdown-shadow` (filter dropdowns), `.filter-label` (11px uppercase tracked labels reused across all filter components).
> - Landing page heading uses Source Serif 4 at `text-4xl sm:text-5xl` with tight tracking — connects to the legal content the tool serves. More generous whitespace (`py-24 sm:py-32`).
> - Header wordmark redesigned: "FPPC" (semibold tracking-wide) + "Opinions" (normal weight, secondary color) + "Advisory Opinion Search" descriptor (hidden on mobile). Frosted glass effect via `bg-surface/80 backdrop-blur-sm`.
> - Content width unified to `max-w-6xl` across header and main.
> - Search bar: larger padding (`py-3.5`), `rounded-xl`, layered CSS shadow focus state (custom `.search-input` class instead of Tailwind ring utilities to avoid box-shadow conflicts).
> - Result cards: shadow-based (`card-shadow` class with `:hover` elevation in CSS), lift on hover (`hover:-translate-y-px`), hairline rule above pill tags, uppercase tracked meta line, `text-[11px]` pills.
> - Filters: all labels use shared `.filter-label` CSS class, `rounded-lg` corners, `dropdown-shadow` on menus, softer focus rings, `transition-all duration-150`.
> - Filter toggle: uppercase tracked style, smaller badge (`w-[18px] h-[18px] text-[10px]`), `ease-in-out` grid animation.
> - Pagination: hairline separator (`border-t border-border-light`), `text-xs tabular-nums` result count, `rounded-lg` buttons, `shadow-sm` on active page, spacer hidden on mobile.
> - Opinion detail: generous spacing (`gap-10`, `pb-8 mb-10`), uppercase tracked opinion number/date, PDF button with `shadow-sm hover:shadow-md`, back button with `inline-flex items-center gap-1.5`.
> - Sidebar card: `border-border-light`, `p-6`, `card-shadow`, `text-[11px] tracking-wider` section headings.
> - Code review caught 3 issues, all fixed: (1) `hover:card-shadow-hover` Tailwind variant on custom CSS class silently failed — moved to `.card-shadow:hover` in CSS; (2) double `px-6` on header + inner div — removed from header element; (3) `.search-input:focus` box-shadow conflicted with Tailwind `focus:ring-*` — removed ring utilities.
> - 15 files modified, purely visual class and CSS updates. No functional, routing, or API changes. Opinion body typography (`.opinion-body`, `.opinion-section`, `.opinion-heading`) untouched.

---

### Sprint 4.2: Interactions, Transitions & Responsive Design
**Estimated Time:** 1-2 hours

**Objective:** Add interaction polish (loading states, transitions, hover effects) and ensure the app works well on mobile devices.

**Tasks:**
- [ ] Loading states:
  - Search results: skeleton cards (gray animated placeholders matching the card layout)
  - Opinion detail: skeleton blocks for each section
  - Initial app load / engine warming: a subtle loading indicator if the first search hits before the engine is ready
- [ ] Transitions:
  - Results appearing: subtle fade-in or slide-up animation on result cards (staggered, not all at once)
  - Page transitions: smooth transition between search and detail views (CSS transition or lightweight library)
  - Filter changes: results area fades briefly while new results load
- [ ] Hover/interaction states:
  - Result cards: subtle lift or border change on hover
  - Buttons: clear hover and active states
  - Links: clear hover state, consistent with accent color
  - Filter pills: clear selected/unselected states
- [ ] Responsive design:
  - Mobile (< 768px): full-width search bar, stacked filters, full-width result cards, opinion body fills screen width with appropriate padding
  - Tablet (768-1024px): similar to mobile but with more whitespace
  - Desktop (> 1024px): centered content with max-width, filters in a row, comfortable reading width
- [ ] Empty/error states: style the no-results message, the 404 page, and any error states to match the design system
- [ ] Accessibility basics: proper heading hierarchy, sufficient color contrast, focus indicators on interactive elements, semantic HTML

**Acceptance Criteria:**
- Loading states are visible and match the design system (no white flashes or layout jumps)
- Page transitions feel smooth, not jarring
- Result cards have a satisfying hover interaction
- The app is fully usable on a phone screen
- The opinion detail view is comfortable to read on mobile
- No accessibility red flags (contrast, focus visibility, heading structure)

**Sprint Update:**
> _[To be completed by Claude Code]_

---

## Phase 5: Deployment

**Goal:** PDFs on Cloudflare R2, app on Railway, everything working in production.

### Sprint 5.1: Production Build & Static File Serving
**Estimated Time:** 1-2 hours

**Objective:** Configure the production build pipeline: React builds to static files, FastAPI serves them, and everything works as a single deployable unit.

**Tasks:**
- [ ] Configure Vite production build to output to `frontend/dist/`
- [ ] Update `backend/main.py` to serve static files from `frontend/dist/` in production mode:
  - Mount `frontend/dist/assets/` at `/assets/` for JS/CSS bundles
  - Add a catch-all route that serves `frontend/dist/index.html` for any non-API route (enables client-side routing)
  - Only enable static file serving when `ENV=production` (in dev, Vite serves its own files)
- [ ] Create a build script (`build.sh` or similar) that:
  1. Installs Python dependencies
  2. Installs frontend dependencies (`cd frontend && npm install`)
  3. Builds the frontend (`cd frontend && npm run build`)
  4. Starts uvicorn
- [ ] Create `Procfile` for Railway: `web: bash build.sh` or equivalent
- [ ] Create `railway.toml` or `nixpacks.toml` if needed to configure the build environment (needs both Python and Node.js)
- [ ] Test the production build locally: run the build script, verify the app works at `localhost:8000` with no Vite dev server

**Acceptance Criteria:**
- `bash build.sh` produces a working app served entirely by FastAPI on a single port
- Client-side routing works (navigating directly to `/opinion/123` serves the React app, not a 404)
- API endpoints still work (`/api/search`, `/api/opinions/{id}`)
- Static assets (JS, CSS, fonts) load correctly with proper caching headers

**Sprint Update:**
> _[To be completed by Claude Code]_

---

### Sprint 5.2: Cloudflare R2 Setup & Railway Deployment
**Estimated Time:** 1-2 hours

**Objective:** Upload PDFs to Cloudflare R2, deploy the app to Railway, and verify everything works in production.

**Tasks:**
- [ ] **Cloudflare R2 setup:**
  - Create an R2 bucket (e.g., `fppc-opinion-pdfs`)
  - Enable public access on the bucket
  - Upload PDFs organized by a URL-friendly scheme (e.g., `/{opinion_id}.pdf` or `/{year}/{opinion_id}.pdf`)
  - Write a simple upload script (`scripts/upload_pdfs.py`) using the AWS S3-compatible API (R2 is S3-compatible) or `rclone`
  - Verify a PDF is accessible at the expected public URL
  - Set `R2_PDF_BASE_URL` in the app config
- [ ] **Upload index files to R2 and configure startup download:**
  - Upload the three pickle files to R2 (same bucket as PDFs, under an `/indexes/` prefix, or a dedicated bucket)
  - Write a download script/function that the app calls at startup to fetch indexes from R2 into the local `indexes/` directory (skip download if files already exist locally, e.g., in development)
  - Set `R2_INDEX_BASE_URL` environment variable in Railway
  - Verify Railway startup downloads indexes and the engine loads them successfully
- [ ] **Railway deployment:**
  - Create a Railway project, connect to the GitHub repo
  - Set environment variables: `OPENAI_API_KEY`, `R2_PDF_BASE_URL`, `ENV=production`
  - Deploy and verify the app starts (check build logs for index loading)
  - Test the full flow: search → results → opinion detail → PDF download
- [ ] **Post-deploy verification:**
  - Run a few representative searches and verify result quality matches the search lab
  - Verify PDF downloads work from R2
  - Verify cited opinion links work
  - Check response times are acceptable (search < 3s including cold start considerations)
  - Test on mobile

**Acceptance Criteria:**
- App is live on a Railway-provided URL (e.g., `fppc-opinions.up.railway.app`)
- Search returns results matching search lab quality
- PDF download links resolve to actual PDFs on R2
- All pages load correctly, including direct navigation to opinion URLs
- No errors in Railway logs during normal operation
- Response times are acceptable for production use

**Sprint Update:**
> _[To be completed by Claude Code]_

---

## Implementation Notes

### Dependencies Between Sprints

Sprints within each phase are sequential. Cross-phase dependencies:
- Phase 3 (frontend) depends on Phase 2 (backend API) for data
- Phase 4 (polish) depends on Phase 3 (frontend) for components to style
- Sprint 5.2 (deployment) depends on everything else
- Sprint 1.1 and 1.2 can be done in parallel if desired, but sequential is fine

### Testing Strategy

- **Backend:** Pytest tests for API endpoints in Sprint 2.1. Error handling tests in Sprint 2.2. The search engine itself is already validated by the 65-query eval suite — do not re-test it, just verify the port works (Sprint 1.1).
- **Frontend:** No unit tests for v1. The visual output is the test. Verify manually or with a quick screenshot comparison.
- **Integration:** After Sprint 5.1, verify the full build works end-to-end locally before deploying.

### Index File Strategy

**Decision: Cloudflare R2 download at startup.**

The three pickle index files total ~162MB. They are hosted on Cloudflare R2 (same infrastructure as the PDFs) and downloaded at app startup. This keeps the git repo small, avoids Git LFS complexity, and uses infrastructure we already have.

- Indexes are gitignored locally and in the repo
- In production (Railway), the app downloads them from R2 on each deploy/restart (~10-30 seconds)
- In development, the files are already present locally in `indexes/` — the download is skipped if files exist
- Upload script (`scripts/upload_indexes.py` or similar) handles pushing updated indexes to R2 when they're rebuilt in the search lab

### Definition of Done

A sprint is complete when:
1. All tasks are checked off
2. Acceptance criteria are met
3. Code runs without errors
4. Sprint Update is filled in with key decisions and notes for future sprints
