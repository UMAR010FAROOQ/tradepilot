import { Bitcoin, DollarSign } from 'lucide-react'
import Card from '../common/Card.jsx'
import PriceChange from './PriceChange.jsx'
import MarketSourceBadge from './MarketSourceBadge.jsx'
import { formatPrice } from '../../utils/marketFormatters.js'

function MarketCard({ ticker, onClick }) {
  const Icon = ticker.type === 'crypto' ? Bitcoin : DollarSign
  const content = <Card className="h-full transition hover:border-accent/40" padding="sm"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><Icon className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{ticker.displaySymbol}</p><p className="truncate text-[11px] text-muted">{ticker.name}</p></div></div><span className="rounded-full bg-elevated px-2 py-1 text-[10px] font-semibold uppercase text-muted">{ticker.type}</span></div><div className="mt-4 flex items-end justify-between gap-3"><p className="financial-value text-lg font-semibold">{formatPrice(ticker.price, ticker)}</p><PriceChange value={ticker.changePercent} /></div><div className="mt-3"><MarketSourceBadge status={ticker.connectionStatus} type={ticker.type} /></div></Card>
  return onClick ? <button className="w-full cursor-pointer text-left" onClick={onClick} type="button">{content}</button> : content
}

export default MarketCard
