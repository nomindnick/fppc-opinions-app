import TopicFilter from './TopicFilter'
import StatuteFilter from './StatuteFilter'
import DateRangeFilter from './DateRangeFilter'

export default function FilterBar({
  filterData,
  topic,
  statute,
  yearStart,
  yearEnd,
  onTopicChange,
  onStatuteChange,
  onDateChange,
  onClearAll,
}) {
  const hasFilters = topic || statute || yearStart || yearEnd

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div className="w-full sm:w-auto sm:min-w-[200px]">
        <TopicFilter
          topics={filterData.topics}
          value={topic}
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
      {hasFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-sm text-text-muted hover:text-accent pb-2"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
