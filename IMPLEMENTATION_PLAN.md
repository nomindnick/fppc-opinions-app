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
  ├── indexes/                  (pre-built pickle files — gitignored or LFS)
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
> - Git LFS not yet configured for indexes — decision deferred (indexes are gitignored for now, will need a deployment strategy in Sprint 5.2)

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
- [ ] Create `backend/metadata.py`: On startup, iterate all opinion JSON files and build an in-memory dict mapping opinion ID → `{opinion_number, date, question, conclusion, topic_primary, topic_secondary, government_code_sections, prior_opinions, year, file_path}`. Log the build time. Consider pre-building this as a pickle/JSON artifact if startup time exceeds 10 seconds.
- [ ] Create Pydantic response models in `backend/models.py`:
  - `SearchResult`: opinion_id, opinion_number, date, question, conclusion (truncated to ~300 chars), topics (list), statutes (list), relevance_score
  - `SearchResponse`: query, total_results, results (list of SearchResult), filters_applied
  - `OpinionDetail`: all structured fields from the JSON, plus a `pdf_url` field constructed from the R2 base URL, plus `cited_opinions` as a list of {opinion_number, opinion_id} for clickable links
- [ ] Create `backend/routers/search.py`:
  - `GET /api/search?q=...&topic=...&statute=...&year_start=...&year_end=...&page=1&per_page=20`
  - Calls the search engine with the query, then applies post-hoc filters (topic, statute, date range) on the results
  - Returns paginated `SearchResponse`
  - If `q` is empty but filters are provided, return filtered browse results (sorted by date descending)
- [ ] Create `backend/routers/opinions.py`:
  - `GET /api/opinions/{opinion_id}` — loads the full JSON file and returns `OpinionDetail`
  - Handle 404 gracefully if opinion ID doesn't exist
- [ ] Create `backend/routers/filters.py`:
  - `GET /api/filters` — returns available filter values: list of topics (with counts), list of statute sections (with counts), year range. Built from the metadata index.
- [ ] Wire all routers into `main.py`

**Acceptance Criteria:**
- `GET /api/search?q=conflict+of+interest` returns a well-structured JSON response with ranked results including question/conclusion previews
- `GET /api/search?q=section+1090&topic=conflicts` returns results filtered to conflicts of interest topic
- `GET /api/opinions/{valid_id}` returns the full opinion data
- `GET /api/opinions/nonexistent` returns 404
- `GET /api/filters` returns topics, statutes, and year range
- API responses are fast: search < 2 seconds, opinion detail < 200ms, filters < 200ms

**Sprint Update:**
> _[To be completed by Claude Code]_

---

### Sprint 2.2: Error Handling, Rate Limiting & OpenAI Fallback
**Estimated Time:** 1 hour

**Objective:** Production-harden the API with graceful error handling, rate limiting on the search endpoint, and automatic BM25 fallback when OpenAI is unavailable.

**Tasks:**
- [ ] Add OpenAI fallback to the search engine: wrap the embedding call in a try/except. If it fails (timeout, auth error, rate limit), log a warning and fall back to BM25-only results for that query. The user should never see a 500 error because OpenAI is down.
- [ ] Add basic rate limiting middleware to FastAPI: 60 requests/minute per IP on the `/api/search` endpoint. Use a simple in-memory token bucket (no Redis needed at this scale). Return 429 with a clear message if exceeded.
- [ ] Add structured error responses: all API errors return `{"error": "message", "detail": "..."}` with appropriate HTTP status codes
- [ ] Add request logging: log each search query (anonymized — no IP) with response time and result count, for future analytics
- [ ] Add a startup event that logs engine load time, corpus size, and index sizes
- [ ] Test error scenarios: invalid query params, missing opinion ID, simulated OpenAI failure

**Acceptance Criteria:**
- Simulating OpenAI failure (bad API key) still returns search results (BM25-only) with no 500 error
- Sending >60 requests/minute to search returns 429 on excess requests
- All error responses follow the consistent JSON error format
- Startup logs show engine initialization details

**Sprint Update:**
> _[To be completed by Claude Code]_

---

## Phase 3: Frontend Core

**Goal:** Fully functional search interface, results display, and opinion detail view. Focus on structure and functionality first — visual polish comes in Phase 4.

### Sprint 3.1: Search Page — Search Bar & Results
**Estimated Time:** 2 hours

**Objective:** Build the search page with a functional search bar and results list displaying opinion cards with question/answer previews.

**Tasks:**
- [ ] Build `SearchBar` component: text input with search icon, debounced (300ms) or submit-on-enter. The query should be reflected in the URL as a query parameter (`?q=...`) so searches are bookmarkable/shareable.
- [ ] Build `ResultCard` component displaying:
  - Opinion number + date (small, muted text, top line)
  - Question (bold, primary text — the main thing attorneys scan)
  - Conclusion/answer preview (regular weight, truncated to ~2-3 lines with ellipsis)
  - Topic and statute pills/tags (small, subtle colored badges)
  - Entire card is clickable, navigates to `/opinion/{id}`
- [ ] Build `ResultsList` component: renders list of `ResultCard` components, handles empty state ("No results found" with helpful message), handles loading state (skeleton cards)
- [ ] Build `Pagination` component: page numbers or prev/next with current page indicator. Syncs with URL params (`?page=2`)
- [ ] Wire `SearchPage` together: on mount (or URL change), read query params, call `/api/search`, display results
- [ ] Handle the initial empty state (no query yet): show a welcome message with corpus description, total opinion count, and perhaps a few example queries attorneys can click to try

**Acceptance Criteria:**
- Typing a query and pressing Enter (or after debounce) fetches results and displays them as cards
- Results show question, conclusion preview, opinion number, date, and topic/statute tags
- Clicking a result card navigates to `/opinion/{id}`
- The URL updates with query params; refreshing the page re-executes the search
- Empty state (no query) shows a welcoming landing view
- Loading state shows skeleton cards while waiting for results
- No-results state shows a helpful message

**Sprint Update:**
> _[To be completed by Claude Code]_

---

### Sprint 3.2: Filters UI
**Estimated Time:** 1-2 hours

**Objective:** Add topic, statute, and date range filters to the search page, synced with URL parameters and the backend API.

**Tasks:**
- [ ] Build `TopicFilter` component: dropdown or set of clickable pills showing available topics. Loads options from `/api/filters`. Single-select or multi-select (decide based on what feels natural — single-select is simpler and probably sufficient).
- [ ] Build `StatuteFilter` component: text input with autocomplete/suggestions from the available statute sections in the filters endpoint. Attorneys should be able to type "1090" and see matching sections.
- [ ] Build `DateRangeFilter` component: two dropdown selects (start year, end year) spanning the corpus range. Defaults to full range.
- [ ] Build `FilterBar` component: composes the three filters in a horizontal row (desktop) or stacked (mobile). Include a "Clear all filters" action.
- [ ] Integrate filters with search: filter values are synced to URL params (`?topic=conflicts&statute=1090&year_start=2010`). Changing a filter re-triggers the search API call with the new parameters.
- [ ] Integrate with `SearchPage`: filters appear below the search bar. Results update when filters change.

**Acceptance Criteria:**
- Selecting a topic filter narrows search results to that topic
- Typing a statute section shows matching suggestions and filters results
- Setting a date range excludes opinions outside that range
- All filter values are reflected in the URL; refreshing preserves filters
- "Clear all" resets filters and shows unfiltered results
- Filters work both with and without a search query (browse mode)

**Sprint Update:**
> _[To be completed by Claude Code]_

---

### Sprint 3.3: Opinion Detail Page
**Estimated Time:** 1-2 hours

**Objective:** Build the full opinion detail view with formatted sections, cited opinion links, and PDF download.

**Tasks:**
- [ ] Build `OpinionHeader` component: opinion number, date, topic tags, statute tags. Prominent but not overwhelming.
- [ ] Build `OpinionBody` component: renders Facts, Question, Analysis, and Conclusion sections with clear section headings. Use the serif font for body text. Handle cases where some sections may be empty/missing in the JSON.
- [ ] Build `CitedOpinions` component: list of opinions cited by this one (from the `prior_opinions` field in the JSON). Each is a clickable link to `/opinion/{id}` if that opinion exists in the corpus. Show opinion number as the link text. If the cited opinion isn't in the corpus (e.g., it references an opinion not in the dataset), show it as plain text.
- [ ] Build `PdfDownloadButton` component: prominent button that links to the R2 PDF URL. Opens in new tab. Include a PDF icon.
- [ ] Build `OpinionPage`: fetches opinion data from `/api/opinions/{id}`, composes the above components. Handle loading state (skeleton) and 404 (opinion not found page).
- [ ] Add a "Back to results" link/button that returns to the search results page (preserving the previous query and filters via URL params)
- [ ] Reading experience: set max-width on the text column (~720px), generous line-height, comfortable font size for the body text

**Acceptance Criteria:**
- Navigating to `/opinion/{valid_id}` shows the full formatted opinion
- All sections (Facts, Question, Analysis, Conclusion) render with clear headings
- Cited opinions appear as clickable links that navigate to the cited opinion's detail page
- PDF download button opens the correct PDF in a new tab (using the R2 URL pattern)
- "Back to results" returns to the search page with previous query/filters intact
- 404 page shows for invalid opinion IDs
- Opinion body text uses serif font with comfortable reading layout

**Sprint Update:**
> _[To be completed by Claude Code]_

---

## Phase 4: Design & Polish

**Goal:** Transform the functional app into something visually impressive. This is where the app goes from "it works" to "wait, you built this?"

### Sprint 4.1: Visual Design System & Typography
**Estimated Time:** 2 hours

**Objective:** Implement the complete visual design system: color palette, typography scale, component styling, and overall layout polish.

**Tasks:**
- [ ] Implement color palette across the app:
  - Background: warm off-white (`#FAFAF8` or similar)
  - Primary text: warm dark gray (not pure black)
  - Secondary/muted text: medium gray
  - Accent color: muted teal or deep blue for interactive elements (links, buttons, active filters)
  - Subtle borders and dividers using light warm grays
  - Result card backgrounds: white with subtle shadow or border
- [ ] Typography system:
  - Sans-serif (Inter) for: navigation, filters, buttons, metadata, opinion number/date, tags
  - Serif (Lora/Source Serif 4) for: opinion body text in the detail view, question text in result cards
  - Establish a type scale: consistent heading sizes, body sizes, caption sizes
  - Line heights: 1.5 for UI text, 1.7 for opinion body reading text
- [ ] Search bar styling: make it the hero element on the landing page. Generous padding, subtle shadow or border, rounded corners. Search icon inside the input.
- [ ] Result card styling: clean card design with clear visual hierarchy. Question text should be the dominant visual element. Subtle hover state. Tags should be small pills with muted colored backgrounds.
- [ ] Filter bar styling: clean, unobtrusive. Filters should feel like refinement tools, not a complex form.
- [ ] Overall layout: generous whitespace throughout. Content max-width on large screens. The app should feel spacious, not cramped.
- [ ] Header/navigation: minimal. App name/logo (text is fine — "FPPC Opinions" in a nice weight), maybe a subtle tagline. No complex nav — there are only two pages.

**Acceptance Criteria:**
- The app has a cohesive, professional visual identity
- Typography is consistent — no mismatched fonts, sizes, or weights
- Color palette is consistent — no default browser blues or random grays
- The search page feels inviting and clean
- Result cards have clear visual hierarchy (question is dominant, metadata is secondary)
- The opinion detail view is a pleasure to read
- The overall impression is "this was designed by someone who cares"

**Sprint Update:**
> _[To be completed by Claude Code]_

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
- [ ] **Handle large index files for deployment:**
  - If indexes are too large for git (>100MB), configure Git LFS or create a build step that downloads them from R2 (store indexes in a separate R2 bucket or the same one in an `/indexes/` prefix)
  - Ensure Railway's build step has access to the index files
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

The three pickle index files total ~162MB. Options in order of preference:
1. **Git LFS:** If the repo is on GitHub with LFS enabled, track `.pkl` files with LFS. Railway supports LFS in builds.
2. **R2 download at build time:** Store indexes in R2, download them during the Railway build step. Adds ~30 seconds to builds but keeps the repo small.
3. **Direct commit:** If the repo is private and <250MB total, just commit them. Simplest approach.

Choose the approach in Sprint 1.1 and document the decision in the sprint update.

### Definition of Done

A sprint is complete when:
1. All tasks are checked off
2. Acceptance criteria are met
3. Code runs without errors
4. Sprint Update is filled in with key decisions and notes for future sprints
