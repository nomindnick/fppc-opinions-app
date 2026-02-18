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
      <div className="flex flex-col lg:flex-row gap-10">
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
  }, [id])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (notFound) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Opinion not found
        </h2>
        <p className="text-text-secondary mb-6">
          No opinion exists with ID "{id}".
        </p>
        <button
          onClick={() => navigate(-1)}
          className="text-accent hover:text-accent-hover text-sm font-medium"
        >
          &larr; Go back
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-accent hover:text-accent-hover text-sm font-medium"
        >
          &larr; Go back
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="text-accent hover:text-accent-hover text-sm font-medium no-underline mb-8 inline-flex items-center gap-1.5 transition-colors"
      >
        &larr; Back
      </button>

      <OpinionHeader opinion={opinion} />

      <div className="flex flex-col lg:flex-row gap-10">
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
