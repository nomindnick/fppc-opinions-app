export default function DateRangeFilter({ yearMin, yearMax, yearStart, yearEnd, onChange }) {
  const years = []
  for (let y = yearMin; y <= yearMax; y++) {
    years.push(y)
  }

  function handleFromChange(e) {
    const from = e.target.value ? parseInt(e.target.value, 10) : null
    let to = yearEnd
    if (from !== null && to !== null && from > to) {
      to = from
    }
    onChange({ yearStart: from, yearEnd: to })
  }

  function handleToChange(e) {
    const to = e.target.value ? parseInt(e.target.value, 10) : null
    let from = yearStart
    if (to !== null && from !== null && to < from) {
      from = to
    }
    onChange({ yearStart: from, yearEnd: to })
  }

  const selectClass =
    'w-full border border-border bg-surface rounded-lg text-sm px-3 py-2 text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-light transition-all duration-150'

  return (
    <div>
      <label className="filter-label">
        Date range
      </label>
      <div className="flex gap-3">
        <div className="flex-1">
          <select
            value={yearStart ?? ''}
            onChange={handleFromChange}
            aria-label="From year"
            className={selectClass}
          >
            <option value="">From</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <select
            value={yearEnd ?? ''}
            onChange={handleToChange}
            aria-label="To year"
            className={selectClass}
          >
            <option value="">To</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
