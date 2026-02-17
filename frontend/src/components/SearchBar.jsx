import { useState, useEffect } from 'react'

export default function SearchBar({ value, onSearch }) {
  const [inputValue, setInputValue] = useState(value)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (trimmed) {
      onSearch(trimmed)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <svg
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Search opinions..."
        className="w-full pl-11 pr-4 py-3 rounded-lg border border-border bg-surface text-text-primary placeholder:text-text-muted shadow-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      />
    </form>
  )
}
