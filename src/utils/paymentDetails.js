export function maskAccount(value) {
  if (!value) return '—'
  const compact = String(value).replace(/\s+/g, '')
  if (compact.length <= 4) return '••••'
  return `•••• ${compact.slice(-4)}`
}

export function requestAccount(item) {
  return item.senderAccount || item.destinationAccount || item.destination || ''
}
