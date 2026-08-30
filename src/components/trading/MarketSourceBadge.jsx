import Badge from '../common/Badge.jsx'

const labels = {
  connecting: 'Connecting',
  reconnecting: 'Reconnecting',
  unavailable: 'Unavailable',
  stale: 'Stale',
  demo: 'Forex Demo',
}

function MarketSourceBadge({ type, status }) {
  const resolvedStatus = status || 'connecting'
  const label = resolvedStatus === 'live'
    ? type === 'crypto' ? 'Binance Live' : 'Forex Live'
    : labels[resolvedStatus] || labels.connecting
  const variant = resolvedStatus === 'live' ? 'positive' : resolvedStatus === 'unavailable' ? 'negative' : 'warning'
  return <Badge variant={variant}><span className={`mr-1.5 size-1.5 rounded-full ${resolvedStatus === 'live' ? 'bg-positive' : resolvedStatus === 'unavailable' ? 'bg-negative' : 'bg-warning'}`} />{label}</Badge>
}

export default MarketSourceBadge
