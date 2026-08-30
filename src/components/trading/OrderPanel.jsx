import { useMemo, useState } from 'react'
import { CircleAlert, WalletCards } from 'lucide-react'
import { MAX_DECIMAL_QUANTITY, MIN_TRADE_USD, TRADING_FEE_RATE } from '../../constants/trading.js'
import { getTicker } from '../../services/marketService.js'
import { executeBuy, executeSell } from '../../services/tradeService.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'
import { formatPrice } from '../../utils/marketFormatters.js'
import { calculatePositionPnl } from '../../utils/pnl.js'
import Button from '../common/Button.jsx'
import Input from '../common/Input.jsx'
import Modal from '../common/Modal.jsx'
import PriceChange from './PriceChange.jsx'

const helpers = [0.25, 0.5, 0.75, 1]

function OrderPanel({ userId, market, ticker, wallet, position, positionLoading, onComplete }) {
  const [side, setSide] = useState('BUY')
  const [quantity, setQuantity] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const price = ticker?.price
  const numericQuantity = Number(quantity)
  const grossAmount = Number.isFinite(numericQuantity) && Number.isFinite(price) ? numericQuantity * price : 0
  const fee = grossAmount * TRADING_FEE_RATE
  const total = side === 'BUY' ? grossAmount + fee : grossAmount - fee
  const pnl = useMemo(() => calculatePositionPnl(position, price), [position, price])
  const forexBlocked = market.type === 'forex' && (
    ticker?.marketStatus !== 'Open' || ticker?.connectionStatus !== 'live' || ticker?.isStale
  )
  const forexMessage = market.type === 'forex' && ticker?.marketStatus && ticker.marketStatus !== 'Open'
    ? 'Forex market is currently closed.'
    : 'Live Forex pricing is unavailable or stale.'

  const chooseFraction = (fraction) => {
    if (!Number.isFinite(price) || price <= 0) return
    const maximum = side === 'BUY'
      ? (wallet?.availableBalance || 0) / (price * (1 + TRADING_FEE_RATE))
      : position?.quantity || 0
    setQuantity(Number((maximum * fraction).toFixed(MAX_DECIMAL_QUANTITY)).toString())
    setError('')
  }

  const prepareOrder = async (event) => {
    event.preventDefault()
    setError('')
    if (forexBlocked) return setError(forexMessage)
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) return setError('Enter a valid quantity greater than zero.')
    if (grossAmount < MIN_TRADE_USD) return setError(`Trade amount must be at least $${MIN_TRADE_USD}.`)
    if (side === 'SELL' && (!position || position.status !== 'open' || position.quantity <= 0)) return setError('No open position to sell.')
    if (side === 'SELL' && numericQuantity > position.quantity) return setError('Sell quantity exceeds your position.')
    try {
      const freshTicker = await getTicker(market.symbol, { forExecution: market.type === 'forex' })
      const freshGross = numericQuantity * freshTicker.price
      const freshFee = freshGross * TRADING_FEE_RATE
      setConfirmation({ price: freshTicker.price, grossAmount: freshGross, fee: freshFee, total: side === 'BUY' ? freshGross + freshFee : freshGross - freshFee })
    } catch (requestError) {
      setError(getFirestoreErrorMessage(requestError))
    }
  }

  const confirmOrder = async () => {
    setProcessing(true)
    setError('')
    try {
      const freshTicker = await getTicker(market.symbol, { forExecution: market.type === 'forex' })
      const execute = side === 'BUY' ? executeBuy : executeSell
      await execute({ userId, symbol: market.symbol, quantity: numericQuantity, executionPrice: freshTicker.price })
      setQuantity('')
      setConfirmation(null)
      onComplete?.(`${side} order filled at ${formatPrice(freshTicker.price, market)}.`)
    } catch (requestError) {
      setError(getFirestoreErrorMessage(requestError))
      setConfirmation(null)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 border-b border-border p-2">{['BUY', 'SELL'].map((item) => <button aria-pressed={side === item} className={`h-10 rounded-lg text-xs font-bold transition ${side === item ? item === 'BUY' ? 'bg-positive/15 text-positive' : 'bg-negative/15 text-negative' : 'text-muted hover:bg-elevated hover:text-foreground'}`} key={item} onClick={() => { setSide(item); setQuantity(''); setError('') }} type="button">{item === 'BUY' ? 'Buy' : 'Sell'}</button>)}</div>
      <form className="space-y-4 p-5" onSubmit={prepareOrder}>
        <div className="rounded-lg border border-border bg-elevated/50 p-3"><div className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-muted"><WalletCards className="size-4" />Available balance</span><span className="financial-value font-semibold">{wallet ? formatCurrency(wallet.availableBalance, wallet.currency) : 'Loading…'}</span></div></div>
        <div className="grid grid-cols-2 gap-3 text-xs"><div><p className="text-muted">Current price</p><p className="financial-value mt-1 font-semibold">{formatPrice(price, market)}</p></div><div><p className="text-muted">Order type</p><p className="mt-1 font-semibold">Market</p></div></div>
        <Input inputMode="decimal" label="Quantity" min="0" onChange={(event) => { setQuantity(event.target.value); setError('') }} placeholder="0.00000000" step="any" type="number" value={quantity} />
        <div className="grid grid-cols-4 gap-2">{helpers.map((fraction) => <button className="h-8 rounded-md border border-border bg-elevated text-[11px] font-semibold text-muted transition hover:border-accent/50 hover:text-foreground" key={fraction} onClick={() => chooseFraction(fraction)} type="button">{fraction === 1 ? 'Max' : `${fraction * 100}%`}</button>)}</div>
        {error && <div className="flex gap-2 rounded-lg border border-negative/25 bg-negative/10 p-3 text-xs text-negative" role="alert"><CircleAlert className="size-4 shrink-0" />{error}</div>}
        {forexBlocked && !error && <div className="rounded-lg border border-warning/25 bg-warning/10 p-3 text-xs text-warning" role="status">{forexMessage}</div>}
        <dl className="space-y-2 border-t border-border pt-4 text-xs"><div className="flex justify-between"><dt className="text-muted">Estimated value</dt><dd className="financial-value">{formatCurrency(grossAmount)}</dd></div><div className="flex justify-between"><dt className="text-muted">Fee (0.10%)</dt><dd className="financial-value">{formatCurrency(fee)}</dd></div><div className="flex justify-between font-semibold"><dt>{side === 'BUY' ? 'Total cost' : 'Estimated proceeds'}</dt><dd className="financial-value">{formatCurrency(total)}</dd></div></dl>
        <Button disabled={!wallet || !ticker || processing || forexBlocked || (side === 'SELL' && (!position || position.quantity <= 0))} fullWidth size="lg" type="submit" variant={side === 'BUY' ? 'success' : 'danger'}>{side === 'BUY' ? 'Review Buy' : 'Review Sell'}</Button>
        <p className="text-center text-[10px] leading-4 text-muted">Simulated market order. No real exchange order is placed.</p>
      </form>
      <div className="border-t border-border p-5"><h3 className="text-xs font-semibold">Current position</h3>{positionLoading ? <span className="mt-3 block h-16 animate-pulse rounded-lg bg-elevated" /> : position?.status === 'open' ? <div className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><p className="text-muted">Quantity</p><p className="financial-value mt-1">{position.quantity}</p></div><div><p className="text-muted">Average entry</p><p className="financial-value mt-1">{formatPrice(position.averageEntryPrice, market)}</p></div><div><p className="text-muted">Market value</p><p className="financial-value mt-1">{formatCurrency(pnl.marketValue)}</p></div><div><p className="text-muted">Unrealized P/L</p><PriceChange amount={pnl.unrealizedPnl} className="mt-1" showAmount value={pnl.unrealizedPnlPercent} /></div></div> : <p className="mt-2 text-xs text-muted">No open {market.displaySymbol} position.</p>}</div>
      <Modal description={`${market.displaySymbol} simulated market order`} footer={<><Button disabled={processing} onClick={() => setConfirmation(null)} variant="ghost">Cancel</Button><Button disabled={processing} onClick={confirmOrder} variant={side === 'BUY' ? 'success' : 'danger'}>{processing ? 'Processing…' : `Confirm ${side === 'BUY' ? 'Buy' : 'Sell'}`}</Button></>} isOpen={Boolean(confirmation)} onClose={() => !processing && setConfirmation(null)} title={`Confirm ${side === 'BUY' ? 'Buy' : 'Sell'}`}>
        {confirmation && <dl className="space-y-3 text-sm"><div className="flex justify-between"><dt className="text-muted">Symbol</dt><dd>{market.displaySymbol}</dd></div><div className="flex justify-between"><dt className="text-muted">Side</dt><dd className={side === 'BUY' ? 'text-positive' : 'text-negative'}>{side}</dd></div><div className="flex justify-between"><dt className="text-muted">Quantity</dt><dd className="financial-value">{numericQuantity}</dd></div><div className="flex justify-between"><dt className="text-muted">Market price</dt><dd className="financial-value">{formatPrice(confirmation.price, market)}</dd></div><div className="flex justify-between"><dt className="text-muted">Estimated fee</dt><dd className="financial-value">{formatCurrency(confirmation.fee)}</dd></div><div className="flex justify-between border-t border-border pt-3 font-semibold"><dt>{side === 'BUY' ? 'Total cost' : 'Estimated proceeds'}</dt><dd className="financial-value">{formatCurrency(confirmation.total)}</dd></div></dl>}
      </Modal>
    </div>
  )
}

export default OrderPanel
