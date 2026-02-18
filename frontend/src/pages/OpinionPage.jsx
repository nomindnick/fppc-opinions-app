import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import OpinionHeader from '../components/OpinionHeader'
import OpinionBody from '../components/OpinionBody'
import OpinionSidebar from '../components/OpinionSidebar'

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-24 bg-border rounded mb-8" />
      <div className="border-b border-border pb-8 mb-10">
        <div className="h-3 w-48 bg-border rounded mb-3" />
        <div className="h-3 w-32 bg-border rounded mb-4" />
        <div className="flex gap-2">
          <div className="h-5 w-20 bg-border rounded-full" />
          <div className="h-5 w-24 bg-border rounded-full" />
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-8 md:gap-10 lg:gap-12">
        <div className="flex-1 min-w-0 max-w-[720px]">
          <div className="h-3 w-16 bg-border rounded mb-4" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-border rounded" />
            <div className="h-4 w-5/6 bg-border rounded" />
            <div className="h-4 w-4/6 bg-border rounded" />
          </div>
          <div className="mt-10">
            <div className="h-3 w-20 bg-border rounded mb-4" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-border rounded" />
              <div className="h-4 w-full bg-border rounded" />
              <div className="h-4 w-3/4 bg-border rounded" />
            </div>
          </div>
        </div>
        <div className="w-full lg:w-72 shrink-0">
          <div className="rounded-lg border border-border-light bg-surface p-6 card-shadow">
            <div className="h-3 w-12 bg-border rounded mb-3" />
            <div className="h-3 w-24 bg-border rounded mb-2" />
            <div className="h-3 w-20 bg-border rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OpinionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [opinion, setOpinion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setNotFound(false)
    setError(null)
    setOpinion(null)

    fetch(`/api/opinions/${id}`, { signal: controller.signal })
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true)
          setLoading(false)
          return null
        }
        if (!res.ok) throw new Error(`Failed to load opinion (${res.status})`)
        return res.json()
      })
      .then((data) => {
        if (data) {
          setOpinion(data)
          setLoading(false)
          window.scrollTo(0, 0)
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError('Something went wrong loading this opinion.')
        setLoading(false)
      })

    return () => controller.abort()
  }, [id, retryKey])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (notFound) {
    return (
      <div className="animate-fade-in text-center py-20">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-border-light mb-5">
          <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Opinion not found
        </h2>
        <p className="text-text-secondary mb-6">
          No opinion exists with ID &ldquo;{id}&rdquo;.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-accent hover:text-accent-hover text-sm font-medium transition-colors"
        >
          &larr; Go back
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="animate-fade-in text-center py-20">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-border-light mb-5">
          <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Something went wrong
        </h2>
        <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto">
          An unexpected error occurred while loading this opinion. Please try again.
        </p>
        <button
          onClick={() => setRetryKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-accent border border-accent rounded-lg hover:bg-accent-light transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="text-accent hover:text-accent-hover text-sm font-medium no-underline mb-8 inline-flex items-center gap-1.5 transition-colors"
      >
        &larr; Back
      </button>

      <OpinionHeader opinion={opinion} />

      <div className="flex flex-col lg:flex-row gap-8 md:gap-10 lg:gap-12">
        <div className="flex-1 min-w-0 max-w-[720px]">
          <OpinionBody opinion={opinion} />
        </div>
        <div className="w-full lg:w-72 shrink-0">
          <div className="lg:sticky lg:top-8">
            <OpinionSidebar opinion={opinion} />
          </div>
        </div>
      </div>
    </div>
  )
}
