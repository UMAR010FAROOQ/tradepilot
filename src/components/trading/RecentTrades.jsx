import { History } from 'lucide-react'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { formatPrice } from '../../utils/marketFormatters.js'
import Card from '../common/Card.jsx'

const formatDate = (timestamp) => timestamp?.toDate?.().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) || 'Pending'

function RecentTrades({ market, trades }) {
  return <Card padding="none"><div className="flex items-center gap-2 border-b border-border px-5 py-4"><History className="size-4 text-accent" /><h2 className="text-sm font-semibold">Recent trades</h2></div>{trades.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-elevated/40 text-[10px] uppercase tracking-wider text-muted"><tr>{['Side', 'Quantity', 'Price', 'Fee', 'Realized P/L', 'Time'].map((label) => <th className="px-5 py-3" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{trades.slice(0, 5).map((trade) => <tr key={trade.id}><td className={`px-5 py-3 font-bold ${trade.side === 'BUY' ? 'text-positive' : 'text-negative'}`}>{trade.side}</td><td className="financial-value px-5 py-3">{trade.quantity}</td><td className="financial-value px-5 py-3">{formatPrice(trade.executionPrice, market)}</td><td className="financial-value px-5 py-3">{formatCurrency(trade.fee)}</td><td className={`financial-value px-5 py-3 ${(trade.realizedPnl || 0) >= 0 ? 'text-positive' : 'text-negative'}`}>{formatCurrency(trade.realizedPnl)}</td><td className="px-5 py-3 text-muted">{formatDate(trade.createdAt)}</td></tr>)}</tbody></table></div> : <div className="p-8 text-center text-xs text-muted">No filled trades for {market.displaySymbol} yet.</div>}</Card>
}

export default RecentTrades
