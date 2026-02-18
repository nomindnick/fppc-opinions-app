import { Link } from 'react-router-dom'

function CitationList({ items }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-text-muted">None</p>
  }

  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.opinion_number} className="text-sm">
          {item.exists_in_corpus ? (
            <Link
              to={`/opinion/${item.opinion_number}`}
              className="text-accent hover:text-accent-hover no-underline hover:underline"
            >
              {item.opinion_number}
            </Link>
          ) : (
            <span className="text-text-muted">{item.opinion_number}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function OpinionSidebar({ opinion }) {
  const { prior_opinions, cited_by, page_count, word_count } = opinion

  const hasCitations =
    (prior_opinions && prior_opinions.length > 0) ||
    (cited_by && cited_by.length > 0)

  const hasMetadata = page_count != null || word_count != null

  if (!hasCitations && !hasMetadata) return null

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      {hasCitations && (
        <div className="mb-6 last:mb-0">
          <div className="mb-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
              Cites
            </h3>
            <CitationList items={prior_opinions} />
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
              Cited By
            </h3>
            <CitationList items={cited_by} />
          </div>
        </div>
      )}

      {hasMetadata && (
        <div className={hasCitations ? 'border-t border-border pt-4' : ''}>
          {page_count != null && (
            <div className="mb-2">
              <div className="text-xs uppercase tracking-wide text-text-muted">
                Pages
              </div>
              <div className="text-sm text-text-secondary">{page_count}</div>
            </div>
          )}
          {word_count != null && (
            <div>
              <div className="text-xs uppercase tracking-wide text-text-muted">
                Words
              </div>
              <div className="text-sm text-text-secondary">
                {word_count.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
