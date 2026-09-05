import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, CircleAlert, WalletCards } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import PriceChange from '../components/trading/PriceChange.jsx'
import useAuth from '../hooks/useAuth.js'
import useWallet from '../hooks/useWallet.js'
import { getTicker, subscribeToTicker } from '../services/marketService.js'
import { subscribeToPositions } from '../services/positionService.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { getFirestoreErrorMessage } from '../utils/firestoreErrors.js'
import { formatPrice } from '../utils/marketFormatters.js'
import { calculatePositionPnl } from '../utils/pnl.js'
import { marketBySymbol } from '../data/markets.js'

function Portfolio() {
  const [positions, setPositions] = useState([])
  const [prices, setPrices] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { currentUser } = useAuth()
  const { wallet, loading: walletLoading } = useWallet()
  const navigate = useNavigate()

  useEffect(() => subscribeToPositions(currentUser.uid, (items) => { setPositions(items); setLoading(false) }, (requestError) => { setError(getFirestoreErrorMessage(requestError)); setLoading(false) }), [currentUser.uid])
  const openPositions = useMemo(() => positions.filter((position) => position.status === 'open' && position.quantity > 0), [positions])

  useEffect(() => {
    let active = true
    Promise.allSettled(openPositions.filter((position) => position.marketType === 'crypto').map((position) => getTicker(position.symbol))).then((results) => {
      if (!active) return
      const tickers = results.filter((result) => result.status === 'fulfilled').map((result) => result.value)
      setPrices(new Map(tickers.map((ticker) => [ticker.symbol, ticker])))
    })
    const unsubscribe = openPositions.map((position) => subscribeToTicker(position.symbol, (ticker) => setPrices((current) => new Map(current).set(ticker.symbol, ticker))))
    return () => { active = false; unsubscribe.forEach((stop) => stop()) }
  }, [openPositions])

  const rows = useMemo(() => openPositions.map((position) => {
    const ticker = prices.get(position.symbol)
    return { ...position, currentPrice: ticker?.price, ...calculatePositionPnl(position, ticker?.price) }
  }), [openPositions, prices])
  const investedValue = rows.reduce((total, position) => total + position.investedAmount, 0)
  const portfolioValue = rows.reduce((total, position) => total + (position.marketValue || 0), 0)
  const unrealizedPnl = rows.reduce((total, position) => total + (position.unrealizedPnl || 0), 0)
  const realizedPnl = positions.reduce((total, position) => total + (position.realizedPnl || 0), 0)
  const accountEquity = (wallet?.availableBalance || 0) + portfolioValue
  const metrics = [
    ['Available cash', wallet ? formatCurrency(wallet.availableBalance, wallet.currency) : 'Unavailable', wallet?.availableBalance],
    ['Open positions value', formatCurrency(portfolioValue), portfolioValue], ['Account equity', formatCurrency(accountEquity), accountEquity],
    ['Invested value', formatCurrency(investedValue), investedValue], ['Unrealized P/L', formatCurrency(unrealizedPnl), unrealizedPnl], ['Realized P/L', formatCurrency(realizedPnl), realizedPnl],
  ]
  const allocationItems = [
    ...rows.filter((position) => (position.marketValue || 0) > 0).map((position) => ({ label: marketBySymbol.get(position.symbol)?.baseAsset || position.symbol, value: position.marketValue })),
    ...(wallet?.availableBalance > 0 ? [{ label: 'Cash', value: wallet.availableBalance }] : []),
  ]
  const allocationTotal = allocationItems.reduce((total, item) => total + item.value, 0)
  const portfolioLoading = loading || walletLoading

  return <div className="space-y-6">
    <PageHeader actions={<Button onClick={() => navigate('/active-trades')} variant="secondary">Manage active trades</Button>} description="Live simulated position values. Market prices are not written to Firestore." eyebrow="Trading" title="Portfolio" />
    {error && <div className="flex gap-2 rounded-lg border border-negative/25 bg-negative/10 p-3 text-sm text-negative" role="alert"><CircleAlert className="size-4" />{error}</div>}
    <section aria-label="Portfolio summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{metrics.map(([label, value, numericValue]) => <Card key={label}><p className="text-xs text-muted">{label}</p>{portfolioLoading ? <span className="mt-3 block h-7 w-28 animate-pulse rounded bg-elevated" /> : <p className={`financial-value mt-3 text-lg font-semibold ${label.includes('P/L') ? numericValue >= 0 ? 'text-positive' : 'text-negative' : ''}`}>{value}</p>}</Card>)}</section>
    <Card><div className="flex items-end justify-between gap-4"><div><h2 className="text-sm font-semibold">Asset allocation</h2><p className="mt-1 text-xs text-muted">Current open-position value and available cash</p></div>{portfolioLoading ? <span className="h-5 w-20 animate-pulse rounded bg-elevated" /> : <p className="financial-value text-sm font-semibold">{formatCurrency(allocationTotal)}</p>}</div>{portfolioLoading ? <div className="mt-6 h-16 animate-pulse rounded-lg bg-elevated" role="status" /> : allocationItems.length === 0 ? <p className="mt-6 text-sm text-muted">No assets to allocate yet.</p> : <div className="mt-6 space-y-4">{allocationItems.map((item) => { const percent = allocationTotal ? item.value / allocationTotal * 100 : 0; return <div key={item.label}><div className="mb-2 flex items-center justify-between gap-4 text-xs"><span className="font-semibold">{item.label}</span><span className="financial-value text-muted">{percent.toFixed(2)}% · {formatCurrency(item.value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-elevated"><div aria-label={`${item.label} ${percent.toFixed(2)} percent`} className="h-full rounded-full bg-accent" role="img" style={{ width: `${percent}%` }} /></div></div>})}</div>}</Card>
    <Card padding="none">
      <div className="border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Open positions</h2><p className="mt-1 text-xs text-muted">Long-only simulated holdings</p></div>
      {loading ? <div className="grid gap-3 p-5">{[1, 2, 3].map((item) => <span className="h-14 animate-pulse rounded-lg bg-elevated" key={item} />)}</div> : rows.length === 0 ? <div className="grid min-h-56 place-items-center p-8 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-xl bg-elevated text-muted"><BriefcaseBusiness className="size-5" /></span><h2 className="mt-4 text-sm font-semibold">No open positions</h2><p className="mt-1 text-xs text-muted">Open a simulated Buy order from a market chart.</p><Button className="mt-4" onClick={() => navigate('/markets')} size="sm">Browse markets</Button></div></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-[0.14em] text-muted"><tr><th className="px-5 py-3">Market</th><th className="px-5 py-3">Side</th><th className="px-5 py-3">Quantity</th><th className="px-5 py-3">Average entry</th><th className="px-5 py-3">Current price</th><th className="px-5 py-3">Market value</th><th className="px-5 py-3">Unrealized P/L</th><th className="px-5 py-3">P/L %</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-border">{rows.map((position) => <tr key={position.id}><td className="px-5 py-4"><p className="text-sm font-semibold">{position.symbol}</p><p className="text-xs capitalize text-muted">{position.marketType}</p></td><td className="px-5 py-4 text-xs font-semibold text-positive">LONG</td><td className="financial-value px-5 py-4 text-sm">{position.quantity}</td><td className="financial-value px-5 py-4 text-sm">{formatPrice(position.averageEntryPrice, position)}</td><td className="financial-value px-5 py-4 text-sm">{formatPrice(position.currentPrice, position)}</td><td className="financial-value px-5 py-4 text-sm">{position.marketValue === null ? '—' : formatCurrency(position.marketValue)}</td><td className="px-5 py-4">{position.unrealizedPnl === null ? '—' : <PriceChange amount={position.unrealizedPnl} showAmount value={position.unrealizedPnlPercent} />}</td><td className="px-5 py-4"><PriceChange value={position.unrealizedPnlPercent || 0} /></td><td className="px-5 py-4 text-right"><Button onClick={() => navigate(`/trade?symbol=${position.symbol}`)} size="sm" variant="secondary">Trade</Button></td></tr>)}</tbody></table></div>}
    </Card>
    <Card className="flex items-start gap-3"><WalletCards className="size-5 shrink-0 text-accent" /><p className="text-xs leading-5 text-muted">Available cash remains in the wallet. Position market value is included only in portfolio equity.</p></Card>
  </div>
}

export default Portfolio
