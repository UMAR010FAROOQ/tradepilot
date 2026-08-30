export function formatPrice(value, market) {
  if (!Number.isFinite(value)) return '—'
  const symbol = typeof market === 'string' ? market : market?.symbol
  const type = typeof market === 'object' ? market?.type : symbol?.endsWith('USDT') ? 'crypto' : 'forex'
  let digits = 2
  if (symbol === 'XAUUSD') digits = 2
  else if (type === 'forex') digits = symbol?.includes('JPY') ? 3 : 5
  else if (value < 1) digits = 5
  else if (value < 100) digits = 3
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
}

export function formatPercent(value) {
  if (!Number.isFinite(value)) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatQuantity(value) {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 8 }).format(value)
}

export function formatVolume(value) {
  if (!Number.isFinite(value)) return 'N/A'
  const units = [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']]
  const unit = units.find(([threshold]) => Math.abs(value) >= threshold)
  return unit ? `${(value / unit[0]).toFixed(value >= unit[0] * 10 ? 1 : 2)}${unit[1]}` : value.toFixed(0)
}
