export default function Pagination({ page, totalResults, perPage, onPageChange }) {
  const totalPages = Math.ceil(totalResults / perPage)

  if (totalPages <= 1) return null

  function getPageNumbers() {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages = []
    pages.push(1)

    if (page > 3) pages.push('...')

    const start = Math.max(2, page - 1)
    const end = Math.min(totalPages - 1, page + 1)
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (page < totalPages - 2) pages.push('...')

    pages.push(totalPages)
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex items-center justify-between mt-10 pt-6 border-t border-border-light">
      <p className="text-xs text-text-muted tabular-nums">
        {totalResults.toLocaleString()} result{totalResults !== 1 ? 's' : ''}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 text-sm rounded-lg border border-border bg-surface text-text-secondary hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Prev
        </button>

        {pageNumbers.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-text-muted">
              &hellip;
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                p === page
                  ? 'border-accent bg-accent text-white font-medium shadow-sm'
                  : 'border-border bg-surface text-text-secondary hover:bg-bg'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 text-sm rounded-lg border border-border bg-surface text-text-secondary hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>

      <div className="w-24 hidden sm:block" />
    </div>
  )
}
