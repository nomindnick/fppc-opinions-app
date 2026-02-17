import { useParams, Link } from 'react-router-dom'

export default function OpinionPage() {
  const { id } = useParams()

  return (
    <div>
      <Link
        to="/"
        className="text-accent hover:text-accent-hover text-sm no-underline mb-6 inline-block"
      >
        ← Back to search
      </Link>

      <h1 className="text-2xl font-bold text-text-primary mb-4">
        Opinion {id}
      </h1>

      <div className="p-6 rounded-lg border border-border bg-surface">
        <p className="font-serif text-lg leading-relaxed text-text-primary">
          This is a placeholder for opinion content. The full opinion text will
          render here in Source Serif 4. Dynamic routing is working — the ID
          parameter from the URL is: <strong>{id}</strong>
        </p>
      </div>
    </div>
  )
}
