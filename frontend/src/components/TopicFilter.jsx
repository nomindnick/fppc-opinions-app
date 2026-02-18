export default function TopicFilter({ topics, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">
        Topic
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full border border-border bg-surface rounded-md text-sm px-3 py-2 text-text-primary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
      >
        <option value="">All topics</option>
        {topics.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label} ({t.count.toLocaleString()})
          </option>
        ))}
      </select>
    </div>
  )
}
