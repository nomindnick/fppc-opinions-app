import { Link, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border py-4 px-6">
        <Link to="/" className="text-lg font-semibold text-text-primary no-underline hover:text-accent">
          FPPC Opinions
        </Link>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
