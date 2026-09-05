import { useMemo, useState } from 'react'
import { Calculator, CircleAlert, ShieldCheck, WalletCards } from 'lucide-react'
import { MAX_DECIMAL_QUANTITY, MIN_TRADE_USD, TRADING_FEE_RATE } from '../../constants/trading.js'
import { getTicker } from '../../services/marketService.js'
import { createLimitOrder } from '../../services/orderService.js'
import { executeBuy } from '../../services/tradeService.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'
import { formatPrice } from '../../utils/marketFormatters.js'
import Button from '../common/Button.jsx'
import Input from '../common/Input.jsx'
import Modal from '../common/Modal.jsx'

const balanceRisks = [1, 2, 5]

function optionalNumber(value) {
  if (value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : NaN
}

function OrderPanel({ userId, market, ticker, wallet, marketOpen, onComplete }) {
  const [orderType, setOrderType] = useState('market')
  const [quantity, setQuantity] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [riskAmount, setRiskAmount] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const entry = orderType === 'limit' ? Number(limitPrice) : ticker?.price
  const numericQuantity = Number(quantity)
  const sl = optionalNumber(stopLoss)
  const tp = optionalNumber(takeProfit)
  const grossAmount = Number.isFinite(entry) && Number.isFinite(numericQuantity) ? entry * numericQuantity : 0
  const fee = grossAmount * TRADING_FEE_RATE
  const total = grossAmount + fee
  const risk = useMemo(() => {
    const validRisk = Number.isFinite(entry) && Number.isFinite(sl) && sl > 0 && sl < entry
    const validReward = Number.isFinite(tp) && tp > entry
    const perUnit = validRisk ? entry - sl : null
    const rewardPerUnit = validReward ? tp - entry : null
    return {
      perUnit,
      loss: perUnit !== null && Number.isFinite(numericQuantity) && numericQuantity > 0 ? perUnit * numericQuantity : null,
      profit: rewardPerUnit !== null && Number.isFinite(numericQuantity) && numericQuantity > 0 ? rewardPerUnit * numericQuantity : null,
      ratio: perUnit && rewardPerUnit !== null ? rewardPerUnit / perUnit : null,
    }
  }, [entry, numericQuantity, sl, tp])
  const requestedRisk = Number(riskAmount)
  const affordableQuantity = Number.isFinite(entry) && entry > 0 ? (wallet?.availableBalance || 0) / (entry * (1 + TRADING_FEE_RATE)) : 0
  const suggestedQuantity = risk.perUnit && Number.isFinite(requestedRisk) && requestedRisk > 0
    ? Math.min(requestedRisk / risk.perUnit, affordableQuantity)
    : 0

  const setBalanceRisk = (percent) => setRiskAmount(((wallet?.availableBalance || 0) * percent / 100).toFixed(2))

  const validate = () => {
    if (!marketOpen) return 'Market is closed. New orders are unavailable.'
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) return 'Enter a valid quantity greater than zero.'
    if (!Number.isFinite(entry) || entry <= 0) return orderType === 'limit' ? 'Enter a valid limit price.' : 'Market price is currently unavailable.'
    if (grossAmount < MIN_TRADE_USD) return `Trade amount must be at least $${MIN_TRADE_USD}.`
    if (sl !== null && (!Number.isFinite(sl) || sl <= 0 || sl >= entry)) return 'Stop loss must be below the estimated entry price.'
    if (tp !== null && (!Number.isFinite(tp) || tp <= entry)) return 'Take profit must be above the estimated entry price.'
    if (total > (wallet?.availableBalance || 0)) return 'Insufficient balance for the estimated total cost.'
    return ''
  }

  const prepareOrder = (event) => {
    event.preventDefault()
    const message = validate()
    setError(message)
    if (!message) setConfirmation(true)
  }

  const confirmOrder = async () => {
    setProcessing(true)
    setError('')
    try {
      if (orderType === 'market') {
        const freshTicker = await getTicker(market.symbol, { forExecution: true })
        const freshTotal = numericQuantity * freshTicker.price * (1 + TRADING_FEE_RATE)
        if (sl !== null && sl >= freshTicker.price) throw Object.assign(new Error(), { code: 'trading/invalid-stop-loss' })
        if (tp !== null && tp <= freshTicker.price) throw Object.assign(new Error(), { code: 'trading/invalid-take-profit' })
        if (freshTotal > (wallet?.availableBalance || 0)) throw Object.assign(new Error(), { code: 'trading/insufficient-balance' })
        await executeBuy({ userId, symbol: market.symbol, quantity: numericQuantity, executionPrice: freshTicker.price, stopLoss: sl, takeProfit: tp })
        onComplete?.(`Market buy filled at ${formatPrice(freshTicker.price, market)}.`)
      } else {
        await createLimitOrder({ userId, symbol: market.symbol, quantity: numericQuantity, limitPrice: entry, stopLoss: sl, takeProfit: tp })
        onComplete?.(`Limit buy placed at ${formatPrice(entry, market)}.`)
      }
      setQuantity(''); setLimitPrice(''); setStopLoss(''); setTakeProfit(''); setRiskAmount(''); setConfirmation(null)
    } catch (requestError) {
      setError(getFirestoreErrorMessage(requestError))
      setConfirmation(null)
    } finally { setProcessing(false) }
  }

  const summary = [
    ['Market', market.displaySymbol], ['Side', 'BUY'], ['Order type', orderType === 'market' ? 'Market' : 'Limit'],
    ['Quantity', Number.isFinite(numericQuantity) && numericQuantity > 0 ? numericQuantity : '—'],
    ['Estimated entry', formatPrice(entry, market)], ['Estimated gross value', formatCurrency(grossAmount)],
    ['Estimated fee', formatCurrency(fee)], ['Estimated total cost', formatCurrency(total)],
    ['Stop loss', sl === null ? 'Not set' : formatPrice(sl, market)], ['Take profit', tp === null ? 'Not set' : formatPrice(tp, market)],
    ['Potential loss', risk.loss === null ? '—' : formatCurrency(risk.loss)], ['Potential profit', risk.profit === null ? '—' : formatCurrency(risk.profit)],
    ['Risk / reward', risk.ratio === null ? '—' : `1:${risk.ratio.toFixed(2)}`],
  ]

  return <div>
    <div className="grid grid-cols-2 border-b border-border p-2" role="tablist" aria-label="Order type">{['market', 'limit'].map((type) => <button aria-selected={orderType === type} className={`h-10 rounded-lg text-xs font-bold capitalize transition ${orderType === type ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-elevated hover:text-foreground'}`} key={type} onClick={() => { setOrderType(type); setError('') }} role="tab" type="button">{type}</button>)}</div>
    <form className="space-y-5 p-5" onSubmit={prepareOrder}>
      <div className="rounded-lg border border-border bg-elevated/50 p-3"><div className="flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2 text-muted"><WalletCards className="size-4" />Available balance</span><span className="financial-value font-semibold">{wallet ? formatCurrency(wallet.availableBalance, wallet.currency) : 'Loading…'}</span></div></div>
      <div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-muted">Side</p><p className="mt-1 text-sm font-bold text-positive">BUY · Long</p></div><div><p className="text-xs text-muted">Live price</p><p className="financial-value mt-1 text-sm font-semibold">{formatPrice(ticker?.price, market)}</p></div></div>
      {orderType === 'limit' && <Input inputMode="decimal" label="Limit price" min="0" onChange={(event) => { setLimitPrice(event.target.value); setError('') }} placeholder="Target price" step="any" type="number" value={limitPrice} />}
      <Input inputMode="decimal" label="Quantity" min="0" onChange={(event) => { setQuantity(event.target.value); setError('') }} placeholder="0.00000000" step="any" type="number" value={quantity} />
      <div className="grid grid-cols-2 gap-3"><Input inputMode="decimal" label="Stop loss (optional)" min="0" onChange={(event) => { setStopLoss(event.target.value); setError('') }} placeholder="Below entry" step="any" type="number" value={stopLoss} /><Input inputMode="decimal" label="Take profit (optional)" min="0" onChange={(event) => { setTakeProfit(event.target.value); setError('') }} placeholder="Above entry" step="any" type="number" value={takeProfit} /></div>
      <section className="space-y-3 rounded-lg border border-border bg-surface p-3" aria-labelledby="position-size-heading"><div className="flex items-center gap-2"><Calculator className="size-4 text-accent" /><h3 className="text-xs font-semibold" id="position-size-heading">Position size helper</h3></div><Input disabled={!risk.perUnit} inputMode="decimal" label="Risk amount (USD)" min="0" onChange={(event) => setRiskAmount(event.target.value)} placeholder={risk.perUnit ? 'Amount to risk' : 'Add a valid stop loss first'} step="any" type="number" value={riskAmount} /><div className="grid grid-cols-3 gap-2">{balanceRisks.map((percent) => <button className="h-8 rounded-md border border-border text-[11px] font-semibold text-muted hover:border-accent/50 hover:text-foreground disabled:opacity-40" disabled={!risk.perUnit} key={percent} onClick={() => setBalanceRisk(percent)} type="button">{percent}% balance</button>)}</div><div className="flex items-center justify-between text-xs"><span className="text-muted">Suggested quantity</span><span className="financial-value font-semibold">{suggestedQuantity > 0 ? suggestedQuantity.toFixed(MAX_DECIMAL_QUANTITY) : '—'}</span></div><Button disabled={!suggestedQuantity} fullWidth onClick={() => setQuantity(suggestedQuantity.toFixed(MAX_DECIMAL_QUANTITY))} size="sm" variant="secondary">Use suggested size</Button></section>
      {error && <div className="flex gap-2 rounded-lg border border-negative/25 bg-negative/10 p-3 text-xs text-negative" role="alert"><CircleAlert className="size-4 shrink-0" />{error}</div>}
      {!marketOpen && !error && <div className="rounded-lg border border-warning/25 bg-warning/10 p-3 text-xs text-warning" role="status">Market closed. Viewing and protection edits remain available.</div>}
      <dl className="space-y-2 border-t border-border pt-4 text-xs">{summary.slice(4).map(([label, value]) => <div className={`flex justify-between gap-3 ${label === 'Estimated total cost' ? 'font-semibold text-foreground' : ''}`} key={label}><dt className="text-muted">{label}</dt><dd className="financial-value text-right">{value}</dd></div>)}</dl>
      <Button disabled={!wallet || !ticker || processing || !marketOpen} fullWidth size="lg" type="submit" variant="success">{orderType === 'market' ? 'Review Market Buy' : 'Review Limit Order'}</Button>
      <div className="flex gap-2 text-[10px] leading-4 text-muted"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" /><p>Simulated only. Pending orders and SL/TP are evaluated while TradePilot is open; they are not exchange-grade protection.</p></div>
    </form>
    <Modal description={`${market.displaySymbol} · simulated BUY`} footer={<><Button disabled={processing} onClick={() => setConfirmation(null)} variant="ghost">Back</Button><Button disabled={processing} onClick={confirmOrder} variant="success">{processing ? 'Processing…' : orderType === 'market' ? 'Confirm Market Buy' : 'Place Limit Order'}</Button></>} isOpen={Boolean(confirmation)} onClose={() => !processing && setConfirmation(null)} title={orderType === 'market' ? 'Confirm Market Buy' : 'Place Limit Order'}><dl className="space-y-3 text-sm">{summary.map(([label, value]) => <div className={`flex justify-between gap-4 ${label === 'Estimated total cost' ? 'border-t border-border pt-3 font-semibold' : ''}`} key={label}><dt className="text-muted">{label}</dt><dd className={`financial-value text-right ${label === 'Side' ? 'text-positive' : ''}`}>{value}</dd></div>)}</dl></Modal>
  </div>
}

export default OrderPanel
