import { Link, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
      >
        Skip to content
      </a>
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 flex items-center gap-3">
          <Link to="/" className="flex items-baseline gap-1.5 no-underline hover:text-accent">
            <span className="text-lg font-semibold tracking-wide text-text-primary">FPPC</span>
            <span className="text-lg font-normal text-text-secondary">Opinions</span>
          </Link>
          <span className="text-xs text-text-muted hidden sm:inline">Advisory Opinion Search</span>
        </div>
      </header>
      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-10">
        <Outlet />
      </main>
    </div>
  )
}
