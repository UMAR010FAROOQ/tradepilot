import Badge from '../common/Badge.jsx'

const labels = {
  live: 'Live Crypto Data',
  connecting: 'Connecting',
  reconnecting: 'Reconnecting',
  unavailable: 'Unavailable',
  fallback: 'Demo fallback',
  demo: 'Demo Forex Data',
}

function MarketSourceBadge({ type, status }) {
  const resolvedStatus = type === 'forex' ? 'demo' : status || 'connecting'
  const variant = resolvedStatus === 'live' ? 'positive' : resolvedStatus === 'unavailable' ? 'negative' : 'warning'
  return <Badge variant={variant}><span className={`mr-1.5 size-1.5 rounded-full ${resolvedStatus === 'live' ? 'bg-positive' : resolvedStatus === 'unavailable' ? 'bg-negative' : 'bg-warning'}`} />{labels[resolvedStatus] || labels.connecting}</Badge>
}

export default MarketSourceBadge
