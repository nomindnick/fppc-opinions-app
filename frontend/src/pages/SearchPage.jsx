import { useState, useEffect } from 'react'

export default function SearchPage() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(setHealth)
      .catch(err => setError(err.message))
  }, [])

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          FPPC Advisory Opinions
        </h1>
        <p className="text-text-secondary text-lg">
          Search ~14,100 advisory opinion letters from 1975–2025
        </p>
      </div>

      <div className="mb-10">
        <input
          type="text"
          disabled
          placeholder="Search opinions… (coming soon)"
          className="w-full px-4 py-3 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-muted shadow-sm"
        />
      </div>

      <div className="mb-10">
        <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-3">
          Typography Preview
        </h2>
        <p className="font-serif text-lg leading-relaxed text-text-primary">
          The Political Reform Act requires every candidate and committee to file
          campaign statements reporting contributions and expenditures. This serif
          text previews how opinion body content will render using Source Serif 4.
        </p>
      </div>

      <div className="p-4 rounded-lg border border-border bg-surface">
        <h2 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-2">
          Backend Status
        </h2>
        {error && <p className="text-red-600 text-sm">Error: {error}</p>}
        {health && (
          <pre className="text-sm text-text-secondary whitespace-pre-wrap">
            {JSON.stringify(health, null, 2)}
          </pre>
        )}
        {!health && !error && (
          <p className="text-sm text-text-muted">Loading…</p>
        )}
      </div>
    </div>
  )
}
