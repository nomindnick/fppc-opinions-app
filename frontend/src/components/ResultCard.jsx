import { Link } from 'react-router-dom'
import { formatDate, formatTopic } from '../utils'

export default function ResultCard({ result, index = 0 }) {
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
      className={`block rounded-lg border border-border-light bg-surface p-4 sm:p-5 md:p-6 card-shadow transition-all hover:-translate-y-px duration-200 no-underline animate-fade-in-up stagger-${Math.min(index + 1, 10)}`}
    >
      <div className="text-xs font-medium tracking-wide uppercase text-text-muted mb-2">
        {opinion_number}
        {formattedDate && <span> &middot; {formattedDate}</span>}
      </div>

      {primaryText && (
        <p className="font-serif text-base font-semibold text-text-primary leading-relaxed line-clamp-3 mb-1.5">
          {primaryText}
        </p>
      )}

      {secondaryText && (
        <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
          {secondaryText}
        </p>
      )}

      {(topics.length > 0 || visibleStatutes.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border-light">
          {topics.map((topic) => (
            <span
              key={topic}
              className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full bg-accent-light text-accent"
            >
              {formatTopic(topic)}
            </span>
          ))}
          {visibleStatutes.map((statute) => (
            <span
              key={statute}
              className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full bg-bg text-text-secondary border border-border"
            >
              &sect;{statute}
            </span>
          ))}
          {extraStatutes > 0 && (
            <span className="inline-block px-2 py-0.5 text-[11px] text-text-muted">
              +{extraStatutes} more
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
