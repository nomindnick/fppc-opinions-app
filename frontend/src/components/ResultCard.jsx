import { Link } from 'react-router-dom'
import { formatDate, formatTopic } from '../utils'

export default function ResultCard({ result }) {
  const {
    opinion_id,
    opinion_number,
    date,
    question,
    conclusion,
    topics,
    statutes,
  } = result

  const primaryText = question || conclusion
  const secondaryText = question ? conclusion : null
  const formattedDate = formatDate(date)
  const maxStatutes = 3
  const visibleStatutes = statutes.slice(0, maxStatutes)
  const extraStatutes = statutes.length - maxStatutes

  return (
    <Link
      to={`/opinion/${opinion_id}`}
      className="block rounded-lg border border-border bg-surface p-5 transition-all hover:border-accent/30 hover:shadow-md no-underline"
    >
      <div className="text-sm text-text-muted mb-1.5">
        {opinion_number}
        {formattedDate && <span> &middot; {formattedDate}</span>}
      </div>

      {primaryText && (
        <p className="font-serif font-semibold text-text-primary leading-snug line-clamp-3 mb-1.5">
          {primaryText}
        </p>
      )}

      {secondaryText && (
        <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 mb-3">
          {secondaryText}
        </p>
      )}

      {(topics.length > 0 || visibleStatutes.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {topics.map((topic) => (
            <span
              key={topic}
              className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-accent-light text-accent"
            >
              {formatTopic(topic)}
            </span>
          ))}
          {visibleStatutes.map((statute) => (
            <span
              key={statute}
              className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-bg text-text-secondary border border-border"
            >
              &sect;{statute}
            </span>
          ))}
          {extraStatutes > 0 && (
            <span className="inline-block px-2 py-0.5 text-xs text-text-muted">
              +{extraStatutes} more
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
