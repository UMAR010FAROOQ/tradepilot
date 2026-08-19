export function formatCurrency(value, currency = 'USD') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unavailable'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
