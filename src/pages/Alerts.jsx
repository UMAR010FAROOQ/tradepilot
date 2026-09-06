import { useEffect, useMemo, useState } from 'react'
import { BellRing, XCircle } from 'lucide-react'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import useAuth from '../hooks/useAuth.js'
import { subscribeToTicker } from '../services/marketService.js'
import { cancelPriceAlert, subscribeToPriceAlerts } from '../services/priceAlertService.js'
import { marketBySymbol } from '../data/markets.js'
import { formatPrice } from '../utils/marketFormatters.js'

const timestamp = (value) => value?.toDate?.().toLocaleString() || '—'
function Alerts() {
  const { currentUser } = useAuth(); const [alerts, setAlerts] = useState([]), [tab, setTab] = useState('active'), [tickers, setTickers] = useState(new Map()), [error, setError] = useState('')
  useEffect(() => subscribeToPriceAlerts(currentUser.uid, setAlerts, () => setError('Price alerts are unavailable.')), [currentUser.uid])
  const active = useMemo(() => alerts.filter((item) => item.status === 'active'), [alerts]); const symbols = useMemo(() => [...new Set(active.map((item) => item.symbol))], [active])
  useEffect(() => { const stops = symbols.map((symbol) => subscribeToTicker(symbol, (ticker) => setTickers((current) => new Map(current).set(symbol, ticker)), () => {})); return () => stops.forEach((stop) => stop()) }, [symbols])
  const visible = tab === 'active' ? active : alerts.filter((item) => item.status !== 'active')
  return <div className="space-y-6"><PageHeader description="Client-side simulated price monitoring across your markets." eyebrow="Trading workflow" title="Price Alerts" />{error && <p className="rounded-lg bg-negative/10 p-3 text-sm text-negative">{error}</p>}<Card padding="none"><div className="flex gap-1 border-b border-border p-3">{['active', 'history'].map((value) => <button aria-pressed={tab === value} className={`h-9 rounded-lg px-4 text-xs font-semibold capitalize ${tab === value ? 'bg-accent/15 text-accent' : 'text-muted'}`} key={value} onClick={() => setTab(value)} type="button">{value}</button>)}</div>{visible.length ? <div className="overflow-x-auto"><table className="w-full min-w-[840px] text-left text-xs"><thead className="bg-elevated/40 text-[10px] uppercase tracking-wider text-muted"><tr>{['Symbol', 'Condition', 'Target', 'Current', 'Distance', 'Status', 'Created', 'Triggered / Cancelled', 'Action'].map((label) => <th className="px-4 py-3" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{visible.map((alert) => { const market = marketBySymbol.get(alert.symbol); const current = tickers.get(alert.symbol)?.price; const distance = Number.isFinite(current) ? Math.abs(alert.targetPrice - current) : null; return <tr key={alert.id}><td className="px-4 py-3 font-semibold">{market?.displaySymbol || alert.symbol}</td><td className="px-4 py-3 capitalize">Price {alert.condition}</td><td className="financial-value px-4 py-3">{formatPrice(alert.targetPrice, market)}</td><td className="financial-value px-4 py-3">{formatPrice(current, market)}</td><td className="financial-value px-4 py-3">{distance === null ? '—' : formatPrice(distance, market)}</td><td className="px-4 py-3"><Badge variant={alert.status === 'active' ? 'positive' : alert.status === 'triggered' ? 'warning' : 'neutral'}>{alert.status}</Badge></td><td className="px-4 py-3 text-muted">{timestamp(alert.createdAt)}</td><td className="px-4 py-3 text-muted">{timestamp(alert.triggeredAt || alert.cancelledAt)}</td><td className="px-4 py-3">{alert.status === 'active' && <Button onClick={() => cancelPriceAlert(currentUser.uid, alert.id).catch(() => setError('Alert could not be cancelled.'))} size="sm" variant="ghost"><XCircle className="size-4" />Cancel</Button>}</td></tr> })}</tbody></table></div> : <div className="grid min-h-56 place-items-center text-center"><div><BellRing className="mx-auto size-7 text-muted" /><p className="mt-3 text-sm font-semibold">No {tab} alerts</p><p className="mt-1 text-xs text-muted">Create alerts from a Trade page.</p></div></div>}</Card><p className="text-xs text-muted">Simulated alerts run while the authenticated TradePilot application is open.</p></div>
}
export default Alerts
