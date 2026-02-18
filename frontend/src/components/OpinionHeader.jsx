import { formatDate, formatTopic } from '../utils'

export default function OpinionHeader({ opinion }) {
  const {
    opinion_number,
    date,
    document_type,
    requestor_name,
    requestor_title,
    requestor_city,
    topic_primary,
    topic_secondary,
    topic_tags,
    government_code_sections,
    regulations,
    pdf_url,
  } = opinion

  const formattedDate = formatDate(date)

  // Combine all topics
  const topics = []
  if (topic_primary) topics.push(topic_primary)
  if (topic_secondary && topic_secondary !== topic_primary) topics.push(topic_secondary)
  if (topic_tags) {
    for (const tag of topic_tags) {
      if (!topics.includes(tag)) topics.push(tag)
    }
  }

  // Combine statutes
  const statutes = [
    ...(government_code_sections || []),
    ...(regulations || []),
  ]

  // Build requestor line
  const requestorParts = [requestor_name, requestor_title, requestor_city].filter(Boolean)
  const requestorLine = requestorParts.length > 0 ? requestorParts.join(', ') : null

  return (
    <div className="border-b border-border pb-8 mb-10">
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <div className="text-xs font-medium tracking-wide uppercase text-text-muted mb-1">
            {opinion_number}
            {formattedDate && <span> &middot; {formattedDate}</span>}
          </div>

          {document_type && (
            <div className="text-xs font-medium text-text-secondary mb-2">
              {document_type}
            </div>
          )}

          {requestorLine && (
            <div className="text-sm text-text-secondary mb-4">
              Requested by {requestorLine}
            </div>
          )}

          {(topics.length > 0 || statutes.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <span
                  key={topic}
                  className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-accent-light text-accent"
                >
                  {formatTopic(topic)}
                </span>
              ))}
              {statutes.map((statute) => (
                <span
                  key={statute}
                  className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-bg text-text-secondary border border-border"
                >
                  &sect;{statute}
                </span>
              ))}
            </div>
          )}
        </div>

        {pdf_url && (
          <a
            href={pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-lg shadow-sm hover:bg-accent-hover hover:shadow-md transition-all duration-200 no-underline"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF
          </a>
        )}
      </div>
    </div>
  )
}
