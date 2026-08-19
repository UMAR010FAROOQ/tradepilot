export function formatAdminDate(timestamp) {
  const date = timestamp?.toDate?.()
  if (!date) return '—'

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function statusVariant(status) {
  if (status === 'approved' || status === 'completed' || status === 'active') return 'positive'
  if (status === 'rejected' || status === 'disabled') return 'negative'
  if (status === 'pending') return 'warning'
  return 'neutral'
}
