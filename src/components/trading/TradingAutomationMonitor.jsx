import { useEffect, useMemo, useRef, useState } from 'react'
import useAuth from '../../hooks/useAuth.js'
import { getTicker, subscribeToTicker } from '../../services/marketService.js'
import { subscribeToAllPendingOrders } from '../../services/orderService.js'
import { subscribeToOpenPositions } from '../../services/positionService.js'
import { executePendingLimitBuy, executeSell } from '../../services/tradeService.js'

function canExecute(item, ticker) {
  return item.marketType === 'crypto' || (
    ticker?.marketStatus === 'Open' && ticker?.connectionStatus === 'live' && !ticker?.isStale
  )
}

function TradingAutomationMonitor() {
  const { currentUser } = useAuth()
  const [orders, setOrders] = useState([])
  const [positions, setPositions] = useState([])
  const [tickers, setTickers] = useState(new Map())
  const activeOrders = useRef(new Set())
  const activeProtections = useRef(new Set())

  useEffect(() => subscribeToAllPendingOrders(currentUser.uid, setOrders, () => {}), [currentUser.uid])
  useEffect(() => subscribeToOpenPositions(currentUser.uid, setPositions, () => {}), [currentUser.uid])

  const symbols = useMemo(() => [...new Set([...orders, ...positions].map((item) => item.symbol))], [orders, positions])
  useEffect(() => {
    const unsubscribe = symbols.map((symbol) => subscribeToTicker(symbol, (ticker) => {
      setTickers((current) => new Map(current).set(symbol, ticker))
    }, () => {}))
    return () => unsubscribe.forEach((stop) => stop())
  }, [symbols])

  useEffect(() => {
    orders.forEach((order) => {
      const ticker = tickers.get(order.symbol)
      if (!canExecute(order, ticker) || !Number.isFinite(ticker?.price) || ticker.price > order.limitPrice || activeOrders.current.has(order.id)) return
      activeOrders.current.add(order.id)
      getTicker(order.symbol, { forExecution: true })
        .then((fresh) => fresh.price <= order.limitPrice ? executePendingLimitBuy({ order, executionPrice: fresh.price }) : null)
        .catch(() => {})
        .finally(() => activeOrders.current.delete(order.id))
    })
  }, [orders, tickers])

  useEffect(() => {
    positions.forEach((position) => {
      const ticker = tickers.get(position.symbol)
      if (!canExecute(position, ticker) || !Number.isFinite(ticker?.price) || activeProtections.current.has(position.symbol)) return
      const trigger = position.stopLoss && ticker.price <= position.stopLoss
        ? 'stopLoss'
        : position.takeProfit && ticker.price >= position.takeProfit ? 'takeProfit' : null
      if (!trigger) return
      activeProtections.current.add(position.symbol)
      getTicker(position.symbol, { forExecution: true })
        .then((fresh) => {
          const stillTriggered = trigger === 'stopLoss' ? fresh.price <= position.stopLoss : fresh.price >= position.takeProfit
          return stillTriggered ? executeSell({ userId: currentUser.uid, symbol: position.symbol, quantity: position.quantity, executionPrice: fresh.price }) : null
        })
        .catch(() => {})
        .finally(() => activeProtections.current.delete(position.symbol))
    })
  }, [currentUser.uid, positions, tickers])

  return null
}

export default TradingAutomationMonitor
