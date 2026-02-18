import { useState, useRef, useEffect } from 'react'

export default function StatuteFilter({ statutes, value, onChange }) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const containerRef = useRef(null)
  const listRef = useRef(null)

  const selectedItem = value
    ? statutes.find((s) => s.value === value)
    : null

  // Sync display text when value changes externally (e.g. URL restore or clear)
  useEffect(() => {
    if (!value) setInput('')
    else if (selectedItem) setInput(selectedItem.label)
  }, [value, selectedItem])

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

  const filtered = input && !selectedItem
    ? statutes
        .filter((s) => {
          const q = input.toLowerCase()
          return s.value.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)
        })
        .slice(0, 10)
    : []

  function handleInputChange(e) {
    const val = e.target.value
    setInput(val)
    if (selectedItem) {
      // User is editing after selection — clear the selection
      onChange(null)
    }
    setOpen(val.length > 0)
    setHighlightIndex(0)
  }

  function handleSelect(statute) {
    onChange(statute.value)
    setInput(statute.label)
    setOpen(false)
  }

  function handleClear() {
    onChange(null)
    setInput('')
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (!open || filtered.length === 0) {
      if (e.key === 'Escape') setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(filtered[highlightIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !listRef.current) return
    const item = listRef.current.children[highlightIndex]
    if (item) item.scrollIntoView({ block: 'nearest' })
  }, [highlightIndex, open])

  return (
    <div ref={containerRef} className="relative">
      <label className="filter-label">
        Statute
      </label>
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onFocus={() => { if (input && !selectedItem) setOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder="Filter by statute..."
          role="combobox"
          aria-expanded={open}
          aria-controls="statute-listbox"
          aria-autocomplete="list"
          className="w-full border border-border bg-surface rounded-lg text-sm pl-3 pr-8 py-2 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-light transition-all duration-150"
        />
        {selectedItem && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary p-0.5"
            aria-label="Clear statute filter"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul
          id="statute-listbox"
          ref={listRef}
          role="listbox"
          className="absolute z-10 mt-1 w-full bg-surface border border-border rounded-lg dropdown-shadow max-h-60 overflow-auto"
        >
          {filtered.map((s, i) => (
            <li
              key={s.value}
              role="option"
              aria-selected={i === highlightIndex}
              onMouseDown={() => handleSelect(s)}
              onMouseEnter={() => setHighlightIndex(i)}
              className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer ${
                i === highlightIndex ? 'bg-accent-light/60' : ''
              }`}
            >
              <span className="text-text-primary">{s.label}</span>
              <span className="text-text-muted text-xs ml-2 shrink-0">
                {s.count.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
