import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import Badge from '../../components/common/Badge.jsx'
import Card from '../../components/common/Card.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import SearchInput from '../../components/common/SearchInput.jsx'
import Select from '../../components/common/Select.jsx'
import Input from '../../components/common/Input.jsx'
import Button from '../../components/common/Button.jsx'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/admin/AdminState.jsx'
import { marketBySymbol } from '../../data/markets.js'
import { getTrades } from '../../services/adminService.js'
import { formatAdminDate } from '../../utils/adminFormatters.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'
import { formatPrice, formatQuantity } from '../../utils/marketFormatters.js'
import { downloadCsv } from '../../utils/csv.js'

const FILTER_NOW = Date.now()

function Trades() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [side, setSide] = useState('all')
  const [status, setStatus] = useState('all')
  const [marketType, setMarketType] = useState('all')
  const [period, setPeriod] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  useEffect(() => {
    let active = true
    getTrades()
      .then((trades) => active && setItems(trades))
      .catch((requestError) => active && setError(getFirestoreErrorMessage(requestError)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const visible = useMemo(() => items.filter((trade) => {
    const date = trade.createdAt?.toDate?.()
    const category = trade.symbol === 'XAUUSD' ? 'gold' : trade.marketType
    const cutoff = period === 'recent' ? FILTER_NOW - 86400000 : period === '7' ? FILTER_NOW - 7 * 86400000 : period === '30' ? FILTER_NOW - 30 * 86400000 : 0
    return (side === 'all' || trade.side === side) && (status === 'all' || trade.status === status) && (marketType === 'all' || category === marketType) && trade.symbol.toLowerCase().includes(search.toLowerCase()) && (!cutoff || (trade.createdAt?.toMillis?.() || 0) >= cutoff) && (!fromDate || date >= new Date(`${fromDate}T00:00:00`)) && (!toDate || date <= new Date(`${toDate}T23:59:59`))
  }), [items, search, side, status, marketType, period, fromDate, toDate])

  return <div className="space-y-6">
    <PageHeader description="Read-only simulated execution records. Trades and P/L cannot be edited here." eyebrow="Trading operations" title="Trades" actions={<Button disabled={!visible.length} onClick={() => downloadCsv(`tradepilot-trades-${new Date().toISOString().slice(0, 10)}.csv`, ['Symbol', 'Side', 'Quantity', 'Execution price', 'Fee', 'Realized P/L', 'Status', 'Created'], visible.map((trade) => [trade.symbol, trade.side, trade.quantity, trade.executionPrice, trade.fee, trade.realizedPnl, trade.status, trade.createdAt?.toDate?.()?.toISOString?.() || '']))} variant="secondary"><Download className="size-4" />Export CSV</Button>} />
    <AdminError message={error} />
    <Card padding="none">
      <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 xl:grid-cols-4"><SearchInput aria-label="Search trades by symbol" onChange={(event) => setSearch(event.target.value)} placeholder="Search symbol" value={search} /><Select aria-label="Filter trade side" onChange={(event) => setSide(event.target.value)} value={side}><option value="all">All sides</option><option value="BUY">Buy</option><option value="SELL">Sell</option></Select><Select aria-label="Filter market type" onChange={(event) => setMarketType(event.target.value)} value={marketType}><option value="all">All markets</option><option value="crypto">Crypto</option><option value="forex">Forex</option><option value="gold">Gold</option></Select><Select aria-label="Filter date period" onChange={(event) => setPeriod(event.target.value)} value={period}><option value="all">All dates</option><option value="recent">Recent (24 hours)</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></Select><Select aria-label="Filter trade status" onChange={(event) => setStatus(event.target.value)} value={status}><option value="all">All statuses</option><option value="filled">Filled</option></Select><Input aria-label="From date" onChange={(event) => setFromDate(event.target.value)} type="date" value={fromDate} /><Input aria-label="To date" onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} /></div>
      {loading ? <AdminLoading /> : visible.length === 0 ? <AdminEmpty title="No trades found" /> : <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left"><thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">User ID</th><th className="px-5 py-3">Symbol</th><th className="px-5 py-3">Side</th><th className="px-5 py-3">Quantity</th><th className="px-5 py-3">Execution price</th><th className="px-5 py-3">Fee</th><th className="px-5 py-3">Realized P/L</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Created</th></tr></thead><tbody className="divide-y divide-border">{visible.map((trade) => <tr key={trade.id}><td className="max-w-36 truncate px-5 py-4 font-mono text-[10px] text-muted" title={trade.userId}>{trade.userId}</td><td className="px-5 py-4 text-sm font-semibold">{marketBySymbol.get(trade.symbol)?.displaySymbol || trade.symbol}</td><td className="px-5 py-4"><Badge variant={trade.side === 'BUY' ? 'positive' : 'negative'}>{trade.side}</Badge></td><td className="financial-value px-5 py-4 text-sm">{formatQuantity(trade.quantity)}</td><td className="financial-value px-5 py-4 text-sm">{formatPrice(trade.executionPrice, marketBySymbol.get(trade.symbol))}</td><td className="financial-value px-5 py-4 text-sm text-muted">{formatCurrency(trade.fee)}</td><td className={`financial-value px-5 py-4 text-sm ${trade.realizedPnl > 0 ? 'text-positive' : trade.realizedPnl < 0 ? 'text-negative' : 'text-muted'}`}>{trade.side === 'SELL' ? formatCurrency(trade.realizedPnl) : '—'}</td><td className="px-5 py-4"><Badge variant="neutral">{trade.status}</Badge></td><td className="px-5 py-4 text-xs text-muted">{formatAdminDate(trade.createdAt)}</td></tr>)}</tbody></table></div>}
    </Card>
  </div>
}

export default Trades
