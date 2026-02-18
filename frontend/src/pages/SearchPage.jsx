import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import SearchLanding from '../components/SearchLanding'
import FilterBar from '../components/FilterBar'
import ResultsList from '../components/ResultsList'
import Pagination from '../components/Pagination'

const PER_PAGE = 20

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const topics = searchParams.getAll('topic')
  const statute = searchParams.get('statute') || null
  const yearStart = searchParams.get('year_start')
    ? parseInt(searchParams.get('year_start'), 10)
    : null
  const yearEnd = searchParams.get('year_end')
    ? parseInt(searchParams.get('year_end'), 10)
    : null

  const [results, setResults] = useState(null)
  const [totalResults, setTotalResults] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filterData, setFilterData] = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const abortRef = useRef(null)
  const prevQueryRef = useRef(query)

  const totalOpinions = filterData?.total_opinions ?? null
  const hasFilters = !!(topics.length > 0 || statute || yearStart || yearEnd)

  // Build URL params with overrides; always resets page to 1 unless explicit
  function buildParams(overrides = {}) {
    const merged = {
      q: query,
      topics,
      statute,
      year_start: yearStart,
      year_end: yearEnd,
      page: 1,
      ...overrides,
    }
    const params = new URLSearchParams()
    for (const [key, val] of Object.entries(merged)) {
      if (key === 'topics') {
        for (const t of val) {
          params.append('topic', t)
        }
      } else if (val != null && val !== '') {
        params.set(key, String(val))
      }
    }
    return params
  }

  // Fetch filter metadata once on mount
  useEffect(() => {
    fetch('/api/filters')
      .then((res) => res.json())
      .then((data) => setFilterData(data))
      .catch(() => {})
  }, [])

  // Fetch search results when query, page, or filters change
  useEffect(() => {
    if (!query) {
      setResults(null)
      setTotalResults(0)
      setError(null)
      prevQueryRef.current = query
      return
    }

    // Clear results for new queries (show skeletons); keep results for filter/page changes (dim effect)
    if (query !== prevQueryRef.current) {
      setResults(null)
    }
    prevQueryRef.current = query

    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    const params = new URLSearchParams({ q: query, page, per_page: PER_PAGE })
    for (const t of topics) params.append('topic', t)
    if (statute) params.set('statute', statute)
    if (yearStart) params.set('year_start', yearStart)
    if (yearEnd) params.set('year_end', yearEnd)

    setLoading(true)
    setError(null)

    fetch(`/api/search?${params}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Search failed (${res.status})`)
        return res.json()
      })
      .then((data) => {
        setResults(data.results)
        setTotalResults(data.total_results)
        setLoading(false)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        const isNetwork = err instanceof TypeError || err.message?.includes('fetch')
        setError(isNetwork ? 'network' : 'error')
        setLoading(false)
      })

    window.scrollTo(0, 0)

    return () => controller.abort()
  }, [query, page, topics.join(','), statute, yearStart, yearEnd, retryKey])

  function handleSearch(q) {
    setSearchParams(buildParams({ q, page: 1 }))
  }

  function handlePageChange(newPage) {
    setSearchParams(buildParams({ page: newPage }))
  }

  function handleExampleClick(q) {
    setSearchParams(buildParams({ q, topics: [], statute: null, year_start: null, year_end: null, page: 1 }))
  }

  function handleTopicChange(newTopics) {
    setSearchParams(buildParams({ topics: newTopics }))
  }

  function handleStatuteChange(val) {
    setSearchParams(buildParams({ statute: val }))
  }

  function handleDateChange({ yearStart: ys, yearEnd: ye }) {
    setSearchParams(buildParams({ year_start: ys, year_end: ye }))
  }

  function handleClearFilters() {
    setSearchParams(buildParams({ topics: [], statute: null, year_start: null, year_end: null }))
  }

  function handleRetry() {
    setRetryKey((k) => k + 1)
  }

  return (
    <div>
      <h1 className="sr-only">FPPC Opinions Search</h1>
      <div className="mb-10">
        <SearchBar value={query} onSearch={handleSearch} />
      </div>

      {!query ? (
        <SearchLanding
          totalOpinions={totalOpinions}
          onExampleClick={handleExampleClick}
        />
      ) : error ? (
        <div className="animate-fade-in text-center py-16">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-border-light mb-5">
            <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            {error === 'network' ? 'Search engine is warming up' : 'Something went wrong'}
          </h2>
          <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
            {error === 'network'
              ? 'The search engine is starting up. This usually takes a moment — please try again shortly.'
              : 'An unexpected error occurred while searching. Please try again.'}
          </p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-accent border border-accent rounded-lg hover:bg-accent-light transition-colors"
          >
            Retry search
          </button>
        </div>
      ) : (
        <div className={loading && results ? 'results-loading' : 'results-ready'}>
          {filterData && (
            <div className="mb-8">
              <FilterBar
                filterData={filterData}
                topics={topics}
                statute={statute}
                yearStart={yearStart}
                yearEnd={yearEnd}
                onTopicChange={handleTopicChange}
                onStatuteChange={handleStatuteChange}
                onDateChange={handleDateChange}
                onClearAll={handleClearFilters}
              />
            </div>
          )}
          <ResultsList results={results} loading={loading && !results} query={query} hasFilters={hasFilters} />
          {!loading && results && results.length > 0 && (
            <Pagination
              page={page}
              totalResults={totalResults}
              perPage={PER_PAGE}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}
    </div>
  )
}
