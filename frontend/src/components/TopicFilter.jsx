import { useState, useRef, useEffect } from 'react'

export default function TopicFilter({ topics, value, onChange }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleToggle(topicValue) {
    const next = value.includes(topicValue)
      ? value.filter((v) => v !== topicValue)
      : [...value, topicValue]
    onChange(next)
  }

  const label =
    value.length === 0
      ? 'All topics'
      : value.length === 1
        ? topics.find((t) => t.value === value[0])?.label ?? value[0]
        : `${value.length} topics`

  return (
    <div ref={containerRef} className="relative">
      <label className="filter-label">
        Topic
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full border border-border bg-surface rounded-lg text-sm px-3 py-2 text-left text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-light transition-all duration-150 flex items-center justify-between"
      >
        <span className={value.length === 0 ? 'text-text-muted' : ''}>
          {label}
        </span>
        <svg
          className={`w-4 h-4 text-text-muted shrink-0 ml-2 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-lg dropdown-shadow max-h-60 overflow-auto">
          {topics.map((t) => (
            <li
              key={t.value}
              onMouseDown={(e) => {
                e.preventDefault()
                handleToggle(t.value)
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent-light/60"
            >
              <span
                className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center ${
                  value.includes(t.value)
                    ? 'bg-accent border-accent text-white'
                    : 'border-border'
                }`}
              >
                {value.includes(t.value) && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="text-text-primary">{t.label}</span>
              <span className="text-text-muted text-xs ml-auto shrink-0">
                {t.count.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
