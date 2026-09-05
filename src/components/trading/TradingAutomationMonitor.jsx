import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'
import { getTicker, subscribeToTicker } from '../../services/marketService.js'
import { subscribeToAllPendingOrders } from '../../services/orderService.js'
import { advanceTrailingStop, subscribeToOpenPositions } from '../../services/positionService.js'
import { executePendingLimitOrder, executeProtectionClose } from '../../services/tradeService.js'

function canExecute(item, ticker) {
  return item.marketType === 'crypto' || (ticker?.marketStatus === 'Open' && ticker?.connectionStatus === 'live' && !ticker?.isStale)
}

function TradingAutomationMonitor() {
  const { currentUser } = useAuth()
  const [orders, setOrders] = useState([])
  const [positions, setPositions] = useState([])
  const [tickers, setTickers] = useState(new Map())
  const [notice, setNotice] = useState('')
  const activeSymbols = useRef(new Set())

  useEffect(() => subscribeToAllPendingOrders(currentUser.uid, setOrders, () => {}), [currentUser.uid])
  useEffect(() => subscribeToOpenPositions(currentUser.uid, setPositions, () => {}), [currentUser.uid])
  const symbols = useMemo(() => [...new Set([...orders, ...positions].map((item) => item.symbol))], [orders, positions])

  useEffect(() => {
    const unsubscribe = symbols.map((symbol) => subscribeToTicker(symbol, (ticker) => setTickers((current) => new Map(current).set(symbol, ticker)), () => {}))
    return () => unsubscribe.forEach((stop) => stop())
  }, [symbols])

  useEffect(() => {
    symbols.forEach((symbol) => {
      if (activeSymbols.current.has(symbol)) return
      const ticker = tickers.get(symbol)
      const position = positions.find((item) => item.symbol === symbol)
      const symbolOrders = orders.filter((item) => item.symbol === symbol)
      if (!Number.isFinite(ticker?.price)) return

      let task = null
      let message = ''
      if (position && canExecute(position, ticker)) {
        if (position.stopLoss && ticker.price <= position.stopLoss) {
          task = async () => {
            const fresh = await getTicker(symbol, { forExecution: true })
            if (fresh.price > position.stopLoss) return
            await executeProtectionClose({ userId: currentUser.uid, symbol, quantity: position.quantity, executionPrice: fresh.price, reason: 'stopLoss' })
            message = `${symbol} stop loss executed.`
          }
        } else if (position.trailingStopEnabled && position.trailingStopPrice && ticker.price <= position.trailingStopPrice) {
          task = async () => {
            const fresh = await getTicker(symbol, { forExecution: true })
            if (fresh.price > position.trailingStopPrice) return
            await executeProtectionClose({ userId: currentUser.uid, symbol, quantity: position.quantity, executionPrice: fresh.price, reason: 'trailingStop' })
            message = `${symbol} trailing stop executed.`
          }
        } else {
          const pendingTarget = position.takeProfitTargets?.find((target) => target.status === 'pending' && ticker.price >= target.price)
          if (pendingTarget) {
            task = async () => {
              const fresh = await getTicker(symbol, { forExecution: true })
              if (fresh.price < pendingTarget.price) return
              const allocationTotal = position.takeProfitTargets.reduce((sum, target) => sum + target.closePercent, 0)
              const isFinalAllocatedTarget = allocationTotal === 100 && !position.takeProfitTargets.some((target) => target.status === 'pending' && target.price > pendingTarget.price)
              const quantity = isFinalAllocatedTarget ? position.quantity : Math.min(position.quantity, (position.takeProfitBaseQuantity || position.quantity) * pendingTarget.closePercent / 100)
              await executeProtectionClose({ userId: currentUser.uid, symbol, quantity, executionPrice: fresh.price, reason: 'takeProfit', targetId: pendingTarget.id })
              message = `${symbol} take-profit target executed.`
            }
          } else if ((!position.takeProfitTargets?.length) && position.takeProfit && ticker.price >= position.takeProfit) {
            task = async () => {
              const fresh = await getTicker(symbol, { forExecution: true })
              if (fresh.price < position.takeProfit) return
              await executeProtectionClose({ userId: currentUser.uid, symbol, quantity: position.quantity, executionPrice: fresh.price, reason: 'takeProfit' })
              message = `${symbol} take profit executed.`
            }
          } else if (position.trailingStopEnabled && ticker.price >= (position.trailingHighWaterMark || 0) * 1.001) {
            task = () => advanceTrailingStop({ userId: currentUser.uid, symbol, currentPrice: ticker.price })
          }
        }
      }

      if (!task) {
        const order = symbolOrders.find((item) => canExecute(item, ticker) && (item.side === 'BUY' ? ticker.price <= item.limitPrice : ticker.price >= item.limitPrice))
        if (order) {
          task = async () => {
            const fresh = await getTicker(symbol, { forExecution: true })
            const conditionMet = order.side === 'BUY' ? fresh.price <= order.limitPrice : fresh.price >= order.limitPrice
            if (!conditionMet) return
            await executePendingLimitOrder({ order, executionPrice: fresh.price })
            message = `${symbol} ${order.side} limit order filled.`
          }
        }
      }

      if (!task) return
      activeSymbols.current.add(symbol)
      Promise.resolve(task()).then(() => { if (message) setNotice(message) }).catch(() => {}).finally(() => activeSymbols.current.delete(symbol))
    })
  }, [currentUser.uid, orders, positions, symbols, tickers])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 5000)
    return () => window.clearTimeout(timer)
  }, [notice])

  if (!notice) return null
  return <div className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-positive/30 bg-elevated p-4 shadow-panel" role="status"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-positive" /><div><p className="text-sm font-semibold">Automation executed</p><p className="mt-1 text-xs text-muted">{notice}</p></div><button aria-label="Dismiss notification" className="ml-2 text-muted hover:text-foreground" onClick={() => setNotice('')} type="button"><X className="size-4" /></button></div>
}

export default TradingAutomationMonitor
