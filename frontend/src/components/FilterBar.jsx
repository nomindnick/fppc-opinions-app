import { useState } from 'react'
import TopicFilter from './TopicFilter'
import StatuteFilter from './StatuteFilter'
import DateRangeFilter from './DateRangeFilter'

export default function FilterBar({
  filterData,
  topics,
  statute,
  yearStart,
  yearEnd,
  onTopicChange,
  onStatuteChange,
  onDateChange,
  onClearAll,
}) {
  const [open, setOpen] = useState(false)

  const activeCount =
    (topics.length > 0 ? 1 : 0) +
    (statute ? 1 : 0) +
    (yearStart || yearEnd ? 1 : 0)

  const hasFilters = activeCount > 0

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted hover:text-text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filters</span>
          {hasFilters && (
            <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-accent text-white text-[10px] font-semibold leading-none">
              {activeCount}
            </span>
          )}
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-text-muted hover:text-accent"
          >
            Clear all
          </button>
        )}
      </div>
      <div
        className={`grid transition-all duration-200 ease-in-out ${open ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
            <div className="w-full sm:w-auto sm:min-w-[200px]">
              <TopicFilter
                topics={filterData.topics}
                value={topics}
                onChange={onTopicChange}
              />
            </div>
            <div className="w-full sm:w-auto sm:min-w-[200px]">
              <StatuteFilter
                statutes={filterData.statutes}
                value={statute}
                onChange={onStatuteChange}
              />
            </div>
            <div className="w-full sm:w-auto sm:min-w-[220px]">
              <DateRangeFilter
                yearMin={filterData.year_min}
                yearMax={filterData.year_max}
                yearStart={yearStart}
                yearEnd={yearEnd}
                onChange={onDateChange}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
