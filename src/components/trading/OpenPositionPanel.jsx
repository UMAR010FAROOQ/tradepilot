import { useMemo, useState } from 'react'
import { CircleAlert, Shield } from 'lucide-react'
import { TRADING_FEE_RATE } from '../../constants/trading.js'
import { getTicker } from '../../services/marketService.js'
import { updatePositionProtection } from '../../services/positionService.js'
import { executeSell } from '../../services/tradeService.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'
import { formatPrice } from '../../utils/marketFormatters.js'
import { calculatePositionPnl } from '../../utils/pnl.js'
import Button from '../common/Button.jsx'
import Card from '../common/Card.jsx'
import Input from '../common/Input.jsx'
import Modal from '../common/Modal.jsx'

const fractions = [25, 50, 75, 100]

function OpenPositionPanel({ market, marketOpen, onComplete, position, ticker, userId }) {
  const [closePercent, setClosePercent] = useState(null)
  const [editing, setEditing] = useState(false)
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const pnl = useMemo(() => calculatePositionPnl(position, ticker?.price), [position, ticker?.price])
  if (!position || position.status !== 'open') return null

  const closeQuantity = closePercent ? Number((position.quantity * closePercent / 100).toFixed(8)) : 0
  const estimatedProceeds = closeQuantity * (ticker?.price || 0) * (1 - TRADING_FEE_RATE)

  const confirmClose = async () => {
    setProcessing(true); setError('')
    try {
      const fresh = await getTicker(market.symbol, { forExecution: true })
      await executeSell({ userId, symbol: market.symbol, quantity: closeQuantity, executionPrice: fresh.price })
      setClosePercent(null)
      onComplete?.(`${closePercent}% of ${market.displaySymbol} closed at ${formatPrice(fresh.price, market)}.`)
    } catch (requestError) { setError(getFirestoreErrorMessage(requestError)) }
    finally { setProcessing(false) }
  }

  const openProtection = () => {
    setStopLoss(position.stopLoss?.toString() || '')
    setTakeProfit(position.takeProfit?.toString() || '')
    setError(''); setEditing(true)
  }

  const saveProtection = async () => {
    setProcessing(true); setError('')
    try {
      await updatePositionProtection({ userId, symbol: market.symbol, stopLoss: stopLoss === '' ? null : Number(stopLoss), takeProfit: takeProfit === '' ? null : Number(takeProfit) })
      setEditing(false)
      onComplete?.(`${market.displaySymbol} protection levels updated.`)
    } catch (requestError) { setError(getFirestoreErrorMessage(requestError)) }
    finally { setProcessing(false) }
  }

  const metrics = [
    ['Quantity', position.quantity], ['Average entry', formatPrice(position.averageEntryPrice, market)],
    ['Current price', formatPrice(ticker?.price, market)], ['Invested value', formatCurrency(position.investedAmount)],
    ['Market value', formatCurrency(pnl.marketValue)], ['Unrealized P/L', formatCurrency(pnl.unrealizedPnl)],
    ['P/L %', pnl.unrealizedPnlPercent === null ? '—' : `${pnl.unrealizedPnlPercent >= 0 ? '+' : ''}${pnl.unrealizedPnlPercent.toFixed(2)}%`],
    ['Stop loss', position.stopLoss ? formatPrice(position.stopLoss, market) : 'Not set'], ['Take profit', position.takeProfit ? formatPrice(position.takeProfit, market) : 'Not set'],
  ]

  return <Card padding="none">
    <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Shield className="size-4 text-accent" /><h2 className="text-sm font-semibold">Open {market.displaySymbol} position</h2></div><p className="mt-1 text-xs text-muted">Long-only simulated position</p></div><Button onClick={openProtection} size="sm" variant="secondary">Edit SL / TP</Button></div>
    <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-5">{metrics.map(([label, value]) => <div className="bg-surface p-4" key={label}><p className="text-[10px] uppercase tracking-wider text-muted">{label}</p><p className={`financial-value mt-1.5 text-sm font-semibold ${label.includes('P/L') ? (pnl.unrealizedPnl || 0) >= 0 ? 'text-positive' : 'text-negative' : ''}`}>{value}</p></div>)}</div>
    <div className="flex flex-wrap items-center gap-2 px-5 py-4"><span className="mr-1 text-xs text-muted">Close position:</span>{fractions.map((percent) => <Button disabled={!marketOpen || !ticker} key={percent} onClick={() => { setError(''); setClosePercent(percent) }} size="sm" variant={percent === 100 ? 'danger' : 'secondary'}>{percent}%</Button>)}</div>
    <Modal description={`${market.displaySymbol} · ${closePercent}% of the open position`} footer={<><Button disabled={processing} onClick={() => setClosePercent(null)} variant="ghost">Cancel</Button><Button disabled={processing} onClick={confirmClose} variant="danger">{processing ? 'Closing…' : 'Confirm close'}</Button></>} isOpen={Boolean(closePercent)} onClose={() => !processing && setClosePercent(null)} title="Close simulated position"><dl className="space-y-3 text-sm"><div className="flex justify-between"><dt className="text-muted">Quantity</dt><dd className="financial-value">{closeQuantity}</dd></div><div className="flex justify-between"><dt className="text-muted">Estimated price</dt><dd className="financial-value">{formatPrice(ticker?.price, market)}</dd></div><div className="flex justify-between"><dt className="text-muted">Estimated proceeds after fee</dt><dd className="financial-value">{formatCurrency(estimatedProceeds)}</dd></div></dl>{error && <div className="mt-4 flex gap-2 rounded-lg border border-negative/25 bg-negative/10 p-3 text-xs text-negative"><CircleAlert className="size-4" />{error}</div>}</Modal>
    <Modal description="Levels apply to the remaining open position." footer={<><Button disabled={processing} onClick={() => setEditing(false)} variant="ghost">Cancel</Button><Button disabled={processing} onClick={saveProtection}>{processing ? 'Saving…' : 'Save protection'}</Button></>} isOpen={editing} onClose={() => !processing && setEditing(false)} title="Edit stop loss and take profit"><div className="space-y-4"><Input inputMode="decimal" label="Stop loss" min="0" onChange={(event) => { setStopLoss(event.target.value); setError('') }} placeholder="No stop loss" step="any" type="number" value={stopLoss} /><Input inputMode="decimal" label="Take profit" min="0" onChange={(event) => { setTakeProfit(event.target.value); setError('') }} placeholder="No take profit" step="any" type="number" value={takeProfit} /><p className="text-xs leading-5 text-muted">Clear a field to remove that level. Stop loss must be below average entry; take profit must be above it.</p>{error && <div className="flex gap-2 rounded-lg border border-negative/25 bg-negative/10 p-3 text-xs text-negative"><CircleAlert className="size-4" />{error}</div>}</div></Modal>
  </Card>
}

export default OpenPositionPanel
