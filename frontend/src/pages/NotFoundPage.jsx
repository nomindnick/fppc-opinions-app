import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="animate-fade-in text-center py-20">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-border-light mb-6">
        <span className="text-2xl font-bold text-text-muted">404</span>
      </div>
      <h1 className="text-xl font-semibold text-text-primary mb-2">
        Page not found
      </h1>
      <p className="text-text-secondary mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-accent hover:text-accent-hover text-sm font-medium transition-colors"
      >
        &larr; Back to search
      </Link>
    </div>
  )
}
