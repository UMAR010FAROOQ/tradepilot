import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import Modal from '../components/common/Modal.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import PriceChange from '../components/trading/PriceChange.jsx'
import { TRADING_FEE_RATE } from '../constants/trading.js'
import useAuth from '../hooks/useAuth.js'
import { getTicker, subscribeToTicker } from '../services/marketService.js'
import { subscribeToOpenPositions } from '../services/positionService.js'
import { executeSell } from '../services/tradeService.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { getFirestoreErrorMessage } from '../utils/firestoreErrors.js'
import { formatPrice } from '../utils/marketFormatters.js'
import { calculatePositionPnl } from '../utils/pnl.js'

const fractions = [25, 50, 75, 100]
const formatDate = (timestamp) => timestamp?.toDate?.().toLocaleString() || 'Pending timestamp'

function ActiveTrades() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [positions, setPositions] = useState([])
  const [tickers, setTickers] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [closing, setClosing] = useState(null)
  const [percent, setPercent] = useState(100)
  const [processing, setProcessing] = useState(false)

  useEffect(() => subscribeToOpenPositions(currentUser.uid, (items) => { setPositions(items); setLoading(false) }, (requestError) => { setError(getFirestoreErrorMessage(requestError)); setLoading(false) }), [currentUser.uid])

  useEffect(() => {
    const stops = positions.map((position) => subscribeToTicker(
      position.symbol,
      (ticker) => setTickers((current) => new Map(current).set(position.symbol, ticker)),
      () => setError(`Live price for ${position.symbol} is temporarily unavailable.`),
    ))
    return () => stops.forEach((stop) => stop())
  }, [positions])

  const rows = useMemo(() => positions.map((position) => {
    const ticker = tickers.get(position.symbol)
    return { ...position, ticker, ...calculatePositionPnl(position, ticker?.price) }
  }), [positions, tickers])
  const investedValue = rows.reduce((total, position) => total + (position.investedAmount || 0), 0)
  const currentMarketValue = rows.reduce((total, position) => total + (position.marketValue || 0), 0)
  const totalUnrealizedPnl = rows.reduce((total, position) => total + (position.unrealizedPnl || 0), 0)

  const openCloseDialog = async (position) => {
    setError('')
    try {
      const ticker = await getTicker(position.symbol, { forExecution: true })
      setTickers((current) => new Map(current).set(position.symbol, ticker))
      setPercent(100)
      setClosing({ ...position, ticker, ...calculatePositionPnl(position, ticker.price) })
    } catch (requestError) { setError(getFirestoreErrorMessage(requestError)) }
  }

  const closeQuantity = closing ? Number((closing.quantity * percent / 100).toFixed(8)) : 0
  const grossProceeds = closing ? closeQuantity * closing.ticker.price : 0
  const fee = grossProceeds * TRADING_FEE_RATE
  const estimatedPnl = closing ? (closing.ticker.price - closing.averageEntryPrice) * closeQuantity - fee : 0

  const confirmClose = async () => {
    setProcessing(true)
    setError('')
    try {
      const ticker = await getTicker(closing.symbol, { forExecution: true })
      await executeSell({ userId: currentUser.uid, symbol: closing.symbol, quantity: closeQuantity, executionPrice: ticker.price })
      setClosing(null)
    } catch (requestError) { setError(getFirestoreErrorMessage(requestError)) }
    finally { setProcessing(false) }
  }

  const cells = (position) => <>
    <td className="px-5 py-4"><p className="text-sm font-semibold">{position.symbol}</p><p className="text-xs capitalize text-muted">{position.marketType} · Long</p></td>
    <td className="financial-value px-5 py-4 text-sm">{position.quantity}</td>
    <td className="financial-value px-5 py-4 text-sm">{formatPrice(position.averageEntryPrice, position)}</td>
    <td className="financial-value px-5 py-4 text-sm">{formatPrice(position.ticker?.price, position)}</td>
    <td className="px-5 py-4">{position.unrealizedPnl === null ? <span className="text-xs text-muted">Waiting for quote</span> : <PriceChange amount={position.unrealizedPnl} showAmount value={position.unrealizedPnlPercent} />}</td>
    <td className="px-5 py-4 text-xs text-muted">{formatDate(position.updatedAt || position.createdAt)}</td>
    <td className="px-5 py-4"><div className="flex justify-end gap-2"><Button onClick={() => navigate(`/trade?symbol=${position.symbol}`)} size="sm" variant="secondary">Open trade</Button><Button disabled={!position.ticker} onClick={() => openCloseDialog(position)} size="sm" variant="danger"><XCircle className="size-3.5" />Close</Button></div></td>
  </>

  return <div className="space-y-6">
    <PageHeader description="Monitor and close your long-only simulated positions using a fresh market quote." eyebrow="Trading" title="Active trades" />
    {error && <div className="flex gap-2 rounded-lg border border-negative/25 bg-negative/10 p-3 text-sm text-negative" role="alert"><CircleAlert className="size-4 shrink-0" />{error}</div>}
    <section aria-label="Active trade summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Open positions', rows.length], ['Invested value', formatCurrency(investedValue)], ['Current market value', formatCurrency(currentMarketValue)], ['Unrealized P/L', formatCurrency(totalUnrealizedPnl)]].map(([label, value]) => <Card key={label}><p className="text-xs text-muted">{label}</p><p className={`financial-value mt-3 text-xl font-semibold ${label === 'Unrealized P/L' ? totalUnrealizedPnl >= 0 ? 'text-positive' : 'text-negative' : ''}`}>{value}</p></Card>)}</section>
    <Card padding="none">
      {loading ? <div className="grid gap-3 p-5" role="status">{[1, 2, 3].map((item) => <span className="h-16 animate-pulse rounded-lg bg-elevated" key={item} />)}</div> : rows.length === 0 ? <div className="grid min-h-64 place-items-center p-8 text-center"><div><XCircle className="mx-auto size-7 text-muted" /><h2 className="mt-3 text-sm font-semibold">No active trades</h2><p className="mt-1 text-xs text-muted">Open a simulated Buy order to create a long position.</p></div></div> : <><div className="divide-y divide-border md:hidden">{rows.map((position) => <article className="space-y-4 p-5" key={position.id}><div className="flex items-start justify-between"><div><h2 className="text-sm font-semibold">{position.symbol}</h2><p className="mt-1 text-xs capitalize text-muted">{position.marketType} · Long</p></div>{position.unrealizedPnl !== null && <PriceChange value={position.unrealizedPnlPercent} />}</div><dl className="grid grid-cols-2 gap-4 text-xs"><div><dt className="text-muted">Quantity</dt><dd className="financial-value mt-1">{position.quantity}</dd></div><div><dt className="text-muted">Entry</dt><dd className="financial-value mt-1">{formatPrice(position.averageEntryPrice, position)}</dd></div><div><dt className="text-muted">Live price</dt><dd className="financial-value mt-1">{formatPrice(position.ticker?.price, position)}</dd></div><div><dt className="text-muted">Unrealized P/L</dt><dd className={`financial-value mt-1 ${(position.unrealizedPnl || 0) >= 0 ? 'text-positive' : 'text-negative'}`}>{position.unrealizedPnl === null ? 'Waiting for quote' : formatCurrency(position.unrealizedPnl)}</dd></div></dl><Button className="w-full" disabled={!position.ticker} onClick={() => openCloseDialog(position)} size="sm" variant="danger"><XCircle className="size-3.5" />Close trade</Button></article>)}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[920px] text-left"><thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-[0.14em] text-muted"><tr><th className="px-5 py-3">Market</th><th className="px-5 py-3">Quantity</th><th className="px-5 py-3">Entry</th><th className="px-5 py-3">Live price</th><th className="px-5 py-3">Unrealized P/L</th><th className="px-5 py-3">Updated</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-border">{rows.map((position) => <tr key={position.id}>{cells(position)}</tr>)}</tbody></table></div></>}
    </Card>
    <Modal description={closing ? `${closing.symbol} · ${percent}% of position` : ''} footer={<><Button disabled={processing} onClick={() => setClosing(null)} variant="ghost">Cancel</Button><Button disabled={processing || closeQuantity <= 0} onClick={confirmClose} variant="danger">{processing ? 'Closing…' : 'Confirm close'}</Button></>} isOpen={Boolean(closing)} onClose={() => !processing && setClosing(null)} title="Close simulated trade">
      {closing && <div className="space-y-5"><div className="grid grid-cols-4 gap-2">{fractions.map((value) => <button aria-pressed={percent === value} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${percent === value ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted hover:text-foreground'}`} key={value} onClick={() => setPercent(value)} type="button">{value}%</button>)}</div><dl className="grid grid-cols-2 gap-4 rounded-lg bg-surface p-4 text-sm"><div><dt className="text-xs text-muted">Quantity</dt><dd className="financial-value mt-1">{closeQuantity}</dd></div><div><dt className="text-xs text-muted">Fresh price</dt><dd className="financial-value mt-1">{formatPrice(closing.ticker.price, closing)}</dd></div><div><dt className="text-xs text-muted">Estimated proceeds</dt><dd className="financial-value mt-1">{formatCurrency(grossProceeds - fee)}</dd></div><div><dt className="text-xs text-muted">Estimated P/L after fee</dt><dd className={`financial-value mt-1 ${estimatedPnl >= 0 ? 'text-positive' : 'text-negative'}`}>{formatCurrency(estimatedPnl)}</dd></div></dl><p className="text-xs leading-5 text-muted">Execution refreshes the quote again. Actual simulated proceeds may differ from this estimate.</p></div>}
    </Modal>
  </div>
}

export default ActiveTrades
