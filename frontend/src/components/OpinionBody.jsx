function renderText(text) {
  return text
    .split(/\n\n+/)
    .filter(Boolean)
    .map((para, i) => (
      <p key={i}>
        {para.replace(/\n/g, ' ')}
      </p>
    ))
}

const SECTIONS = [
  { key: 'question', label: 'Question' },
  { key: 'facts', label: 'Facts' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'conclusion', label: 'Conclusion' },
]

export default function OpinionBody({ opinion }) {
  const { has_standard_format } = opinion

  const hasSections = SECTIONS.some((s) => opinion[s.key])

  if (!hasSections) return null

  return (
    <div className="opinion-body">
      {has_standard_format === false && (
        <p className="font-sans text-xs italic text-text-muted mb-8 pl-4 border-l-2 border-border leading-relaxed">
          This opinion was extracted from a non-standard format and may contain
          formatting artifacts.
        </p>
      )}

      {SECTIONS.filter(({ key }) => opinion[key]).map(({ key, label }, idx) => (
        <section key={key} className={idx > 0 ? 'opinion-section' : 'opinion-section opinion-section-first'}>
          <h2 className="opinion-heading">
            {label}
          </h2>
          {renderText(opinion[key])}
        </section>
      ))}
    </div>
  )
}
