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
  const topic = searchParams.get('topic') || null
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
  const abortRef = useRef(null)

  const totalOpinions = filterData?.total_opinions ?? null
  const hasFilters = !!(topic || statute || yearStart || yearEnd)

  // Build URL params with overrides; always resets page to 1 unless explicit
  function buildParams(overrides = {}) {
    const merged = {
      q: query,
      topic,
      statute,
      year_start: yearStart,
      year_end: yearEnd,
      page: 1,
      ...overrides,
    }
    const params = {}
    for (const [key, val] of Object.entries(merged)) {
      if (val != null && val !== '') {
        params[key] = String(val)
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
      return
    }

    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    const params = new URLSearchParams({ q: query, page, per_page: PER_PAGE })
    if (topic) params.set('topic', topic)
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
        setError('Something went wrong. Please try again.')
        setLoading(false)
      })

    window.scrollTo(0, 0)

    return () => controller.abort()
  }, [query, page, topic, statute, yearStart, yearEnd])

  function handleSearch(q) {
    setSearchParams(buildParams({ q, page: 1 }))
  }

  function handlePageChange(newPage) {
    setSearchParams(buildParams({ page: newPage }))
  }

  function handleExampleClick(q) {
    setSearchParams(buildParams({ q, topic: null, statute: null, year_start: null, year_end: null, page: 1 }))
  }

  function handleTopicChange(val) {
    setSearchParams(buildParams({ topic: val }))
  }

  function handleStatuteChange(val) {
    setSearchParams(buildParams({ statute: val }))
  }

  function handleDateChange({ yearStart: ys, yearEnd: ye }) {
    setSearchParams(buildParams({ year_start: ys, year_end: ye }))
  }

  function handleClearFilters() {
    setSearchParams(buildParams({ topic: null, statute: null, year_start: null, year_end: null }))
  }

  return (
    <div>
      <div className="mb-8">
        <SearchBar value={query} onSearch={handleSearch} />
      </div>

      {!query ? (
        <SearchLanding
          totalOpinions={totalOpinions}
          onExampleClick={handleExampleClick}
        />
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <>
          {filterData && (
            <div className="mb-6">
              <FilterBar
                filterData={filterData}
                topic={topic}
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
          <ResultsList results={results} loading={loading} query={query} hasFilters={hasFilters} />
          {!loading && results && results.length > 0 && (
            <Pagination
              page={page}
              totalResults={totalResults}
              perPage={PER_PAGE}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  )
}
