import ResultCard from './ResultCard'

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-border-light bg-surface p-6 card-shadow animate-pulse">
      <div className="h-4 w-48 bg-border/60 rounded mb-3" />
      <div className="h-5 w-full bg-border/60 rounded mb-2" />
      <div className="h-5 w-3/4 bg-border/60 rounded mb-2" />
      <div className="h-4 w-full bg-border/40 rounded mb-1" />
      <div className="h-4 w-2/3 bg-border/40 rounded mb-4" />
      <div className="flex gap-2">
        <div className="h-5 w-24 bg-border/40 rounded-full" />
        <div className="h-5 w-16 bg-border/40 rounded-full" />
      </div>
    </div>
  )
}

export default function ResultsList({ results, loading, query, hasFilters }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (results && results.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-text-secondary text-lg mb-2">
          No results found for &ldquo;{query}&rdquo;
          {hasFilters && ' with the current filters'}
        </p>
        <p className="text-text-muted text-sm">
          {hasFilters
            ? 'Try broadening your search or removing some filters.'
            : 'Try different keywords, a statute number (e.g. \u201cSection 87100\u201d), or a broader search term.'}
        </p>
      </div>
    )
  }

  if (!results) return null

  return (
    <div className="flex flex-col gap-4">
      {results.map((result) => (
        <ResultCard key={result.opinion_id} result={result} />
      ))}
    </div>
  )
}
