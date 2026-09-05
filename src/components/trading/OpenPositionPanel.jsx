import { useMemo, useState } from 'react'
import { CircleAlert, Gauge, Shield, Zap } from 'lucide-react'
import { TRADING_FEE_RATE } from '../../constants/trading.js'
import { getTicker } from '../../services/marketService.js'
import { configureTrailingStop, setBreakEvenStop, updatePositionProtection, updateTakeProfitTargets } from '../../services/positionService.js'
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
const trailingPresets = [1, 2, 3, 5]
const targetId = () => globalThis.crypto?.randomUUID?.() || `tp-${Date.now()}`

function ageFrom(timestamp) {
  const date = timestamp?.toDate?.()
  if (!date) return 'Unavailable'
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`
}

function OpenPositionPanel({ market, marketOpen, onComplete, position, ticker, userId }) {
  const [dialog, setDialog] = useState('')
  const [closePercent, setClosePercent] = useState(100)
  const [stopLoss, setStopLoss] = useState('')
  const [trailingPercent, setTrailingPercent] = useState('')
  const [targets, setTargets] = useState([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const pnl = useMemo(() => calculatePositionPnl(position, ticker?.price), [position, ticker?.price])
  if (!position || position.status !== 'open') return null

  const breakEven = position.averageEntryPrice * (1 + TRADING_FEE_RATE) / (1 - TRADING_FEE_RATE)
  const pendingTargets = position.takeProfitTargets?.filter((target) => target.status === 'pending') || []
  const nearestTp = pendingTargets[0]?.price || position.takeProfit || null
  const distanceToStop = position.stopLoss && ticker?.price ? ticker.price - position.stopLoss : null
  const distanceToTp = nearestTp && ticker?.price ? nearestTp - ticker.price : null
  const riskAmount = position.stopLoss ? Math.max(0, position.averageEntryPrice - position.stopLoss) * position.quantity : null
  const potentialReward = nearestTp ? Math.max(0, nearestTp - position.averageEntryPrice) * position.quantity : null
  const riskReward = riskAmount > 0 && potentialReward !== null ? potentialReward / riskAmount : null
  const closeQuantity = Number((position.quantity * closePercent / 100).toFixed(8))
  const estimatedProceeds = closeQuantity * (ticker?.price || 0) * (1 - TRADING_FEE_RATE)
  const protectionActive = Boolean(position.stopLoss || position.takeProfit || pendingTargets.length || position.trailingStopEnabled)

  const fail = (requestError) => setError(getFirestoreErrorMessage(requestError))
  const confirmClose = async () => {
    setProcessing(true); setError('')
    try { const fresh = await getTicker(market.symbol, { forExecution: true }); await executeSell({ userId, symbol: market.symbol, quantity: closeQuantity, executionPrice: fresh.price }); setDialog(''); onComplete?.(`${closePercent}% of ${market.displaySymbol} closed.`) }
    catch (requestError) { fail(requestError) } finally { setProcessing(false) }
  }
  const saveStop = async () => {
    setProcessing(true); setError('')
    try { await updatePositionProtection({ userId, symbol: market.symbol, stopLoss: stopLoss === '' ? null : Number(stopLoss), takeProfit: position.takeProfit ?? null }); setDialog(''); onComplete?.('Stop loss updated.') }
    catch (requestError) { fail(requestError) } finally { setProcessing(false) }
  }
  const confirmBreakEven = async () => {
    setProcessing(true); setError('')
    try { const fresh = await getTicker(market.symbol, { forExecution: true }); const price = await setBreakEvenStop({ userId, symbol: market.symbol, currentPrice: fresh.price }); setDialog(''); onComplete?.(`Approximate break-even stop set at ${formatPrice(price, market)}.`) }
    catch (requestError) { fail(requestError) } finally { setProcessing(false) }
  }
  const saveTrailing = async (disable = false) => {
    setProcessing(true); setError('')
    try { const fresh = disable ? null : await getTicker(market.symbol, { forExecution: true }); await configureTrailingStop({ userId, symbol: market.symbol, percent: disable ? null : Number(trailingPercent), currentPrice: fresh?.price }); setDialog(''); onComplete?.(disable ? 'Trailing stop disabled.' : 'Trailing stop enabled.') }
    catch (requestError) { fail(requestError) } finally { setProcessing(false) }
  }
  const openTargets = () => { setTargets((position.takeProfitTargets?.length ? position.takeProfitTargets.filter((target) => target.status === 'pending') : position.takeProfit ? [{ id: targetId(), price: position.takeProfit, closePercent: 100 }] : []).map((target) => ({ ...target, price: String(target.price), closePercent: String(target.closePercent) }))); setError(''); setDialog('targets') }
  const saveTargets = async () => {
    setProcessing(true); setError('')
    try { await updateTakeProfitTargets({ userId, symbol: market.symbol, targets }); setDialog(''); onComplete?.('Take-profit targets updated.') }
    catch (requestError) { fail(requestError) } finally { setProcessing(false) }
  }

  const metrics = [
    ['Quantity', position.quantity], ['Average entry', formatPrice(position.averageEntryPrice, market)], ['Current price', formatPrice(ticker?.price, market)],
    ['Market value', formatCurrency(pnl.marketValue)], ['Unrealized P/L', formatCurrency(pnl.unrealizedPnl)], ['P/L %', pnl.unrealizedPnlPercent === null ? '—' : `${pnl.unrealizedPnlPercent >= 0 ? '+' : ''}${pnl.unrealizedPnlPercent.toFixed(2)}%`],
    ['Distance to stop', distanceToStop === null ? '—' : formatPrice(distanceToStop, market)], ['Distance to nearest TP', distanceToTp === null ? '—' : formatPrice(distanceToTp, market)], ['Break-even price', formatPrice(breakEven, market)],
    ['Risk amount', riskAmount === null ? '—' : formatCurrency(riskAmount)], ['Potential reward', potentialReward === null ? '—' : formatCurrency(potentialReward)], ['Current R/R', riskReward === null ? '—' : `1:${riskReward.toFixed(2)}`], ['Position age', ageFrom(position.openedAt)],
  ]

  return <Card padding="none">
    <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Shield className="size-4 text-accent" /><h2 className="text-sm font-semibold">Open {market.displaySymbol} position</h2>{protectionActive && <span className="rounded-full bg-positive/10 px-2 py-1 text-[10px] font-bold text-positive" title="Simulated automation runs while TradePilot is open.">Protection Active</span>}</div><p className="mt-1 text-xs text-muted">Long-only simulated position</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => { setStopLoss(position.stopLoss?.toString() || ''); setError(''); setDialog('stop') }} size="sm" variant="secondary">Edit Stop Loss</Button><Button onClick={openTargets} size="sm" variant="secondary">Manage Take Profit</Button></div></div>
    <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-5">{metrics.map(([label, value]) => <div className="bg-surface p-4" key={label}><p className="text-[10px] uppercase tracking-wider text-muted">{label}</p><p className={`financial-value mt-1.5 text-sm font-semibold ${label.includes('P/L') ? (pnl.unrealizedPnl || 0) >= 0 ? 'text-positive' : 'text-negative' : ''}`}>{value}</p></div>)}</div>
    <section className="border-t border-border p-5"><div className="mb-3 flex items-center gap-2"><Gauge className="size-4 text-accent" /><h3 className="text-xs font-semibold">Position Protection</h3></div><div className="grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-lg bg-elevated p-3"><p className="text-muted">Stop Loss</p><p className="financial-value mt-1 font-semibold">{position.stopLoss ? formatPrice(position.stopLoss, market) : 'Not set'}</p></div><div className="rounded-lg bg-elevated p-3"><p className="text-muted">Take Profit</p><p className="financial-value mt-1 font-semibold">{pendingTargets.length ? `${pendingTargets.length} target${pendingTargets.length > 1 ? 's' : ''}` : position.takeProfit ? formatPrice(position.takeProfit, market) : 'Not set'}</p></div><div className="rounded-lg bg-elevated p-3"><p className="text-muted">Trailing Stop</p><p className="financial-value mt-1 font-semibold">{position.trailingStopEnabled ? `${position.trailingStopPercent}% · ${formatPrice(position.trailingStopPrice, market)}` : 'Disabled'}</p></div><div className="rounded-lg bg-elevated p-3"><p className="text-muted">Approx. Break Even</p><p className="financial-value mt-1 font-semibold">{formatPrice(breakEven, market)}</p></div></div><div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => { setTrailingPercent(position.trailingStopPercent?.toString() || '2'); setError(''); setDialog('trailing') }} size="sm" variant="secondary">{position.trailingStopEnabled ? 'Manage Trailing Stop' : 'Enable Trailing Stop'}</Button><Button disabled={!ticker || ticker.price <= breakEven} onClick={() => { setError(''); setDialog('breakEven') }} size="sm" variant="secondary"><Zap className="size-3.5" />Set Break Even</Button></div><p className="mt-3 text-[10px] text-muted">Simulated automation runs while TradePilot is open.</p></section>
    <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-4"><span className="mr-1 text-xs text-muted">Close position:</span>{fractions.map((percent) => <Button disabled={!marketOpen || !ticker} key={percent} onClick={() => { setClosePercent(percent); setError(''); setDialog('close') }} size="sm" variant={percent === 100 ? 'danger' : 'secondary'}>{percent}%</Button>)}</div>

    <Modal description={`${market.displaySymbol} · ${closePercent}% of the open position`} footer={<><Button disabled={processing} onClick={() => setDialog('')} variant="ghost">Cancel</Button><Button disabled={processing} onClick={confirmClose} variant="danger">{processing ? 'Closing…' : 'Confirm close'}</Button></>} isOpen={dialog === 'close'} onClose={() => !processing && setDialog('')} title="Close simulated position"><dl className="space-y-3 text-sm"><div className="flex justify-between"><dt className="text-muted">Quantity</dt><dd className="financial-value">{closeQuantity}</dd></div><div className="flex justify-between"><dt className="text-muted">Estimated proceeds after fee</dt><dd className="financial-value">{formatCurrency(estimatedProceeds)}</dd></div></dl>{error && <ErrorMessage>{error}</ErrorMessage>}</Modal>
    <Modal description="Clear the field to remove the stop." footer={<><Button disabled={processing} onClick={() => setDialog('')} variant="ghost">Cancel</Button><Button disabled={processing} onClick={saveStop}>{processing ? 'Saving…' : 'Save Stop Loss'}</Button></>} isOpen={dialog === 'stop'} onClose={() => !processing && setDialog('')} title="Edit Stop Loss"><Input inputMode="decimal" label="Stop loss" min="0" onChange={(event) => { setStopLoss(event.target.value); setError('') }} placeholder="No stop loss" step="any" type="number" value={stopLoss} /><p className="mt-3 text-xs text-muted">A manually entered stop must be below average entry.</p>{error && <ErrorMessage>{error}</ErrorMessage>}</Modal>
    <Modal description="Targets use a percentage of the position quantity when configured." footer={<><Button disabled={processing} onClick={() => setDialog('')} variant="ghost">Cancel</Button><Button disabled={processing} onClick={saveTargets}>{processing ? 'Saving…' : 'Save Targets'}</Button></>} isOpen={dialog === 'targets'} onClose={() => !processing && setDialog('')} title="Manage Take-Profit Targets"><div className="space-y-3">{targets.map((target, index) => <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-lg border border-border p-3" key={target.id}><Input label={`TP${index + 1} price`} min="0" onChange={(event) => setTargets((items) => items.map((item) => item.id === target.id ? { ...item, price: event.target.value } : item))} step="any" type="number" value={target.price} /><Input label="Close %" max="100" min="0" onChange={(event) => setTargets((items) => items.map((item) => item.id === target.id ? { ...item, closePercent: event.target.value } : item))} step="any" type="number" value={target.closePercent} /><Button aria-label={`Remove TP${index + 1}`} onClick={() => setTargets((items) => items.filter((item) => item.id !== target.id))} size="sm" variant="ghost">Remove</Button></div>)}{targets.length < 3 && <Button onClick={() => setTargets((items) => [...items, { id: targetId(), price: '', closePercent: '' }])} size="sm" variant="secondary">Add Target</Button>}<p className="text-xs leading-5 text-muted">Up to three ascending targets. Total allocation cannot exceed 100%. Percentages use the position size when targets are saved.</p>{error && <ErrorMessage>{error}</ErrorMessage>}</div></Modal>
    <Modal description="The trailing level moves upward after meaningful new highs and never moves down." footer={<><Button disabled={processing} onClick={() => setDialog('')} variant="ghost">Cancel</Button>{position.trailingStopEnabled && <Button disabled={processing} onClick={() => saveTrailing(true)} variant="danger">Disable</Button>}<Button disabled={processing} onClick={() => saveTrailing(false)}>{processing ? 'Saving…' : 'Enable / Update'}</Button></>} isOpen={dialog === 'trailing'} onClose={() => !processing && setDialog('')} title="Trailing Stop"><div className="space-y-4"><div className="grid grid-cols-4 gap-2">{trailingPresets.map((value) => <button aria-pressed={Number(trailingPercent) === value} className={`h-10 rounded-lg border text-xs font-semibold ${Number(trailingPercent) === value ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted'}`} key={value} onClick={() => setTrailingPercent(String(value))} type="button">{value}%</button>)}</div><Input label="Custom percentage" max="25" min="0.1" onChange={(event) => { setTrailingPercent(event.target.value); setError('') }} step="0.1" type="number" value={trailingPercent} />{error && <ErrorMessage>{error}</ErrorMessage>}</div></Modal>
    <Modal description={`Fee-adjusted estimate: ${formatPrice(breakEven, market)}`} footer={<><Button disabled={processing} onClick={() => setDialog('')} variant="ghost">Cancel</Button><Button disabled={processing} onClick={confirmBreakEven}>{processing ? 'Setting…' : 'Set Break Even Stop'}</Button></>} isOpen={dialog === 'breakEven'} onClose={() => !processing && setDialog('')} title="Set Approximate Break Even"><p className="text-sm leading-6 text-muted">This uses the configured entry and exit fee rate. Execution may still differ because the final close uses a fresh quote.</p>{error && <ErrorMessage>{error}</ErrorMessage>}</Modal>
  </Card>
}

function ErrorMessage({ children }) { return <div className="mt-4 flex gap-2 rounded-lg border border-negative/25 bg-negative/10 p-3 text-xs text-negative" role="alert"><CircleAlert className="size-4 shrink-0" />{children}</div> }

export default OpenPositionPanel
