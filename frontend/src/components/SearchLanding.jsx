const EXAMPLE_QUERIES = [
  'Section 87100 conflict of interest',
  'can a city council member vote on a project near their home',
]

export default function SearchLanding({ totalOpinions, onExampleClick }) {
  return (
    <div className="text-center py-24 sm:py-32">
      <h1 className="font-serif text-4xl sm:text-5xl font-semibold tracking-tight text-text-heading mb-3">
        FPPC Advisory Opinions
      </h1>
      <p className="text-text-secondary text-lg mb-14 max-w-lg mx-auto">
        Search{' '}
        {totalOpinions
          ? `${totalOpinions.toLocaleString()} advisory`
          : 'thousands of advisory'}{' '}
        opinion letters from the California Fair Political Practices Commission,
        spanning 1975 to 2025.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        {EXAMPLE_QUERIES.map((query) => (
          <button
            key={query}
            onClick={() => onExampleClick(query)}
            className="px-5 py-2.5 text-sm text-text-secondary bg-surface border border-border rounded-full hover:border-accent/40 hover:text-accent hover:shadow-sm transition-all duration-200"
          >
            &ldquo;{query}&rdquo;
          </button>
        ))}
      </div>
    </div>
  )
}
