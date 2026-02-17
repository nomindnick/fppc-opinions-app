import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import SearchLanding from '../components/SearchLanding'
import ResultsList from '../components/ResultsList'
import Pagination from '../components/Pagination'

const PER_PAGE = 20

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)

  const [results, setResults] = useState(null)
  const [totalResults, setTotalResults] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [totalOpinions, setTotalOpinions] = useState(null)
  const abortRef = useRef(null)

  // Fetch filter metadata once on mount
  useEffect(() => {
    fetch('/api/filters')
      .then((res) => res.json())
      .then((data) => setTotalOpinions(data.total_opinions))
      .catch(() => {})
  }, [])

  // Fetch search results when query or page changes
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
  }, [query, page])

  function handleSearch(q) {
    setSearchParams({ q, page: 1 })
  }

  function handlePageChange(newPage) {
    setSearchParams({ q: query, page: newPage })
  }

  function handleExampleClick(q) {
    setSearchParams({ q, page: 1 })
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
          <ResultsList results={results} loading={loading} query={query} />
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
