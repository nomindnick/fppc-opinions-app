export function formatDate(dateStr) {
  if (!dateStr) return null
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatTopic(topic) {
  return topic.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
