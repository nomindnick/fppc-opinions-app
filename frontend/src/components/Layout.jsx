import { Link, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm py-4">
        <div className="max-w-6xl mx-auto px-6 flex items-center gap-3">
          <Link to="/" className="flex items-baseline gap-1.5 no-underline hover:text-accent">
            <span className="text-lg font-semibold tracking-wide text-text-primary">FPPC</span>
            <span className="text-lg font-normal text-text-secondary">Opinions</span>
          </Link>
          <span className="text-xs text-text-muted hidden sm:inline">Advisory Opinion Search</span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">
        <Outlet />
      </main>
    </div>
  )
}
