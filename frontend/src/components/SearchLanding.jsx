const EXAMPLE_QUERIES = [
  'Section 87100 conflict of interest',
  'can a city council member vote on a project near their home',
]

export default function SearchLanding({ totalOpinions, onExampleClick }) {
  return (
    <div className="text-center py-20">
      <h1 className="text-3xl font-bold text-text-primary mb-3">
        FPPC Advisory Opinions
      </h1>
      <p className="text-text-secondary text-lg mb-10 max-w-xl mx-auto">
        Search{' '}
        {totalOpinions
          ? `${totalOpinions.toLocaleString()} advisory`
          : 'thousands of advisory'}{' '}
        opinion letters from the California Fair Political Practices Commission,
        spanning 1975 to 2025.
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLE_QUERIES.map((query) => (
          <button
            key={query}
            onClick={() => onExampleClick(query)}
            className="px-4 py-2 text-sm text-text-secondary bg-surface border border-border rounded-full hover:border-accent/40 hover:text-accent transition-colors"
          >
            &ldquo;{query}&rdquo;
          </button>
        ))}
      </div>
    </div>
  )
}
