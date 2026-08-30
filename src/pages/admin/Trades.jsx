import { useEffect, useMemo, useState } from 'react'
import Badge from '../../components/common/Badge.jsx'
import Card from '../../components/common/Card.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import SearchInput from '../../components/common/SearchInput.jsx'
import Select from '../../components/common/Select.jsx'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/admin/AdminState.jsx'
import { marketBySymbol } from '../../data/markets.js'
import { getTrades } from '../../services/adminService.js'
import { formatAdminDate } from '../../utils/adminFormatters.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'
import { formatPrice, formatQuantity } from '../../utils/marketFormatters.js'

function Trades() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [side, setSide] = useState('all')

  useEffect(() => {
    let active = true
    getTrades()
      .then((trades) => active && setItems(trades))
      .catch((requestError) => active && setError(getFirestoreErrorMessage(requestError)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const visible = useMemo(() => items.filter((trade) => (
    (side === 'all' || trade.side === side) && trade.symbol.toLowerCase().includes(search.toLowerCase())
  )), [items, search, side])

  return <div className="space-y-6">
    <PageHeader description="Read-only simulated execution records. Trades and P/L cannot be edited here." eyebrow="Trading operations" title="Trades" />
    <AdminError message={error} />
    <Card padding="none">
      <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-[1fr_180px]"><SearchInput aria-label="Search trades by symbol" onChange={(event) => setSearch(event.target.value)} placeholder="Search symbol" value={search} /><Select aria-label="Filter trade side" onChange={(event) => setSide(event.target.value)} value={side}><option value="all">All sides</option><option value="BUY">Buy</option><option value="SELL">Sell</option></Select></div>
      {loading ? <AdminLoading /> : visible.length === 0 ? <AdminEmpty title="No trades found" /> : <div className="overflow-x-auto"><table className="w-full min-w-[940px] text-left"><thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">Symbol</th><th className="px-5 py-3">Side</th><th className="px-5 py-3">Quantity</th><th className="px-5 py-3">Execution price</th><th className="px-5 py-3">Fee</th><th className="px-5 py-3">Realized P/L</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Created</th></tr></thead><tbody className="divide-y divide-border">{visible.map((trade) => <tr key={trade.id}><td className="px-5 py-4 text-sm font-semibold">{marketBySymbol.get(trade.symbol)?.displaySymbol || trade.symbol}</td><td className="px-5 py-4"><Badge variant={trade.side === 'BUY' ? 'positive' : 'negative'}>{trade.side}</Badge></td><td className="financial-value px-5 py-4 text-sm">{formatQuantity(trade.quantity)}</td><td className="financial-value px-5 py-4 text-sm">{formatPrice(trade.executionPrice, marketBySymbol.get(trade.symbol))}</td><td className="financial-value px-5 py-4 text-sm text-muted">{formatCurrency(trade.fee)}</td><td className={`financial-value px-5 py-4 text-sm ${trade.realizedPnl > 0 ? 'text-positive' : trade.realizedPnl < 0 ? 'text-negative' : 'text-muted'}`}>{trade.side === 'SELL' ? formatCurrency(trade.realizedPnl) : '—'}</td><td className="px-5 py-4"><Badge variant="neutral">{trade.status}</Badge></td><td className="px-5 py-4 text-xs text-muted">{formatAdminDate(trade.createdAt)}</td></tr>)}</tbody></table></div>}
    </Card>
  </div>
}

export default Trades
