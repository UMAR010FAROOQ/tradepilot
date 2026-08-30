import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CircleAlert, CircleDollarSign, ReceiptText, Target } from 'lucide-react'
import Card from '../components/common/Card.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import PerformanceChart from '../components/charts/PerformanceChart.jsx'
import useAuth from '../hooks/useAuth.js'
import useWallet from '../hooks/useWallet.js'
import { subscribeToTicker } from '../services/marketService.js'
import { subscribeToPositions } from '../services/positionService.js'
import { subscribeToTrades } from '../services/tradeService.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { getFirestoreErrorMessage } from '../utils/firestoreErrors.js'
import { calculatePositionPnl } from '../utils/pnl.js'
import { buildMarketBreakdown, buildRealizedPnlSeries, calculateTradeAnalytics } from '../utils/tradeAnalytics.js'

function Analytics() {
  const { currentUser } = useAuth(); const { wallet } = useWallet()
  const [trades, setTrades] = useState([]); const [positions, setPositions] = useState([]); const [tickers, setTickers] = useState(new Map()); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  useEffect(() => subscribeToTrades(currentUser.uid, (items) => { setTrades(items); setLoading(false) }, (requestError) => { setError(getFirestoreErrorMessage(requestError)); setLoading(false) }), [currentUser.uid])
  useEffect(() => subscribeToPositions(currentUser.uid, setPositions, (requestError) => setError(getFirestoreErrorMessage(requestError))), [currentUser.uid])
  const openPositions = useMemo(() => positions.filter((position) => position.status === 'open' && position.quantity > 0), [positions])
  useEffect(() => { const stops = openPositions.map((position) => subscribeToTicker(position.symbol, (ticker) => setTickers((current) => new Map(current).set(ticker.symbol, ticker)))); return () => stops.forEach((stop) => stop()) }, [openPositions])
  const valuations = openPositions.map((position) => calculatePositionPnl(position, tickers.get(position.symbol)?.price))
  const unrealized = valuations.reduce((total, value) => total + (value.unrealizedPnl || 0), 0)
  const marketValue = valuations.reduce((total, value) => total + (value.marketValue || 0), 0)
  const analytics = useMemo(() => calculateTradeAnalytics(trades, positions, unrealized), [positions, trades, unrealized])
  const series = useMemo(() => buildRealizedPnlSeries(trades), [trades]); const breakdown = useMemo(() => buildMarketBreakdown(trades), [trades])
  const currentEquity = (wallet?.availableBalance || 0) + marketValue
  const mainMetrics = [
    ['Total trades', analytics.totalTrades], ['Buy trades', analytics.buyTrades], ['Sell trades', analytics.sellTrades], ['Open positions', analytics.openPositions], ['Closed positions', analytics.closedPositions],
    ['Realized P/L', formatCurrency(analytics.realizedPnl)], ['Unrealized P/L', formatCurrency(analytics.unrealizedPnl)], ['Trading fees', formatCurrency(analytics.fees)], ['Profitable closes', analytics.profitableTrades], ['Losing closes', analytics.losingTrades],
  ]
  const performance = [['Win rate', `${analytics.winRate.toFixed(2)}%`], ['Average win', formatCurrency(analytics.averageWin)], ['Average loss', formatCurrency(analytics.averageLoss)], ['Largest win', formatCurrency(analytics.largestWin)], ['Largest loss', formatCurrency(analytics.largestLoss)], ['Trading volume', formatCurrency(analytics.tradingVolume)]]
  return <div className="space-y-6"><PageHeader description="Performance derived from your actual simulated trades and current open positions." eyebrow="Trading" title="Analytics" />{error && <div className="flex gap-2 rounded-lg border border-negative/25 bg-negative/10 p-3 text-sm text-negative" role="alert"><CircleAlert className="size-4" />{error}</div>}
    <section aria-label="Trading metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">{mainMetrics.map(([label, value]) => <Card key={label}><p className="text-xs text-muted">{label}</p>{loading ? <span className="mt-3 block h-7 w-24 animate-pulse rounded bg-elevated" /> : <p className={`financial-value mt-3 text-xl font-semibold ${label.includes('P/L') && Number(String(value).replace(/[^0-9.-]/g, '')) < 0 ? 'text-negative' : ''}`}>{value}</p>}</Card>)}</section>
    <div className="grid gap-4 lg:grid-cols-3"><Card><CircleDollarSign className="size-5 text-accent" /><p className="mt-4 text-xs text-muted">Current equity</p><p className="financial-value mt-2 text-xl font-semibold">{formatCurrency(currentEquity)}</p><p className="mt-2 text-xs leading-5 text-muted">Current cash plus live open-position value. This is not a historical snapshot.</p></Card><Card><Target className="size-5 text-positive" /><p className="mt-4 text-xs text-muted">Cumulative realized P/L</p><p className={`financial-value mt-2 text-xl font-semibold ${analytics.realizedPnl >= 0 ? 'text-positive' : 'text-negative'}`}>{formatCurrency(analytics.realizedPnl)}</p><p className="mt-2 text-xs leading-5 text-muted">Derived only from completed simulated SELL trades.</p></Card><Card><ReceiptText className="size-5 text-warning" /><p className="mt-4 text-xs text-muted">Total fees</p><p className="financial-value mt-2 text-xl font-semibold">{formatCurrency(analytics.fees)}</p><p className="mt-2 text-xs leading-5 text-muted">Sum of recorded BUY and SELL execution fees.</p></Card></div>
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.7fr)]"><Card padding="none"><PerformanceChart data={series} /></Card><Card padding="none"><div className="border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Performance metrics</h2><p className="mt-1 text-xs text-muted">Based on completed SELL outcomes</p></div><dl className="divide-y divide-border">{performance.map(([label, value]) => <div className="flex items-center justify-between gap-4 px-5 py-3.5" key={label}><dt className="text-xs text-muted">{label}</dt><dd className="financial-value text-sm font-semibold">{value}</dd></div>)}</dl></Card></div>
    <Card padding="none"><div className="border-b border-border px-5 py-4"><div className="flex items-center gap-2"><BarChart3 className="size-4 text-accent" /><h2 className="text-sm font-semibold">Performance by market</h2></div></div>{breakdown.length === 0 ? <div className="p-8 text-center text-sm text-muted">No market activity yet.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">Market</th><th className="px-5 py-3">Trades</th><th className="px-5 py-3">Volume</th><th className="px-5 py-3">Realized P/L</th></tr></thead><tbody className="divide-y divide-border">{breakdown.map((row) => <tr key={row.symbol}><td className="px-5 py-4 text-sm font-semibold">{row.symbol}</td><td className="financial-value px-5 py-4 text-sm">{row.trades}</td><td className="financial-value px-5 py-4 text-sm">{formatCurrency(row.volume)}</td><td className={`financial-value px-5 py-4 text-sm ${row.realizedPnl >= 0 ? 'text-positive' : 'text-negative'}`}>{formatCurrency(row.realizedPnl)}</td></tr>)}</tbody></table></div>}</Card>
  </div>
}
export default Analytics
