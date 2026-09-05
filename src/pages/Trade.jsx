import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Activity, ChartCandlestick, Maximize, Minimize, RotateCcw, ShieldCheck } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Card from '../components/common/Card.jsx'
import IconButton from '../components/common/IconButton.jsx'
import Select from '../components/common/Select.jsx'
import MarketSourceBadge from '../components/trading/MarketSourceBadge.jsx'
import OrderPanel from '../components/trading/OrderPanel.jsx'
import OpenPositionPanel from '../components/trading/OpenPositionPanel.jsx'
import PendingOrders from '../components/trading/PendingOrders.jsx'
import PriceChange from '../components/trading/PriceChange.jsx'
import RecentTrades from '../components/trading/RecentTrades.jsx'
import TradingCalculator from '../components/trading/TradingCalculator.jsx'
import { marketBySymbol, markets } from '../data/markets.js'
import useAuth from '../hooks/useAuth.js'
import useWallet from '../hooks/useWallet.js'
import { getHistoricalCandles, subscribeToTicker } from '../services/marketService.js'
import { subscribeToSymbolOrders } from '../services/orderService.js'
import { subscribeToPosition } from '../services/positionService.js'
import { subscribeToSymbolTrades } from '../services/tradeService.js'
import { getFirestoreErrorMessage } from '../utils/firestoreErrors.js'
import { formatPrice, formatVolume } from '../utils/marketFormatters.js'
import { getForexSessionStatus } from '../utils/forexSession.js'

const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d']
const TradingChart = lazy(() => import('../components/charts/TradingChart.jsx'))

function Trade() {
  const [searchParams] = useSearchParams()
  const requestedSymbol = searchParams.get('symbol')?.toUpperCase() || 'BTCUSDT'
  const symbol = marketBySymbol.has(requestedSymbol) ? requestedSymbol : 'BTCUSDT'
  const invalidSymbol = requestedSymbol !== symbol
  const market = marketBySymbol.get(symbol)
  const [interval, setIntervalValue] = useState('1h')
  const [candles, setCandles] = useState([])
  const [ticker, setTicker] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [streamError, setStreamError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  const [position, setPosition] = useState(null)
  const [positionLoading, setPositionLoading] = useState(true)
  const [tradeNotice, setTradeNotice] = useState('')
  const [chartExpanded, setChartExpanded] = useState(false)
  const [resetSignal, setResetSignal] = useState(0)
  const [pendingOrders, setPendingOrders] = useState([])
  const [trades, setTrades] = useState([])
  const [showTradeLevels, setShowTradeLevels] = useState(true)
  const { currentUser } = useAuth()
  const { wallet } = useWallet()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    getHistoricalCandles(symbol, interval)
      .then((items) => { if (active) { setCandles(items); setError('') } })
      .catch(() => active && setError(market.type === 'crypto' ? 'Binance chart data could not be loaded.' : 'Forex chart data could not be loaded.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [interval, market.type, symbol])

  useEffect(() => subscribeToTicker(
    symbol,
    setTicker,
    () => setStreamError('Live price updates are temporarily unavailable.'),
    (status) => {
      setConnectionStatus(status)
      if (status === 'live' || status === 'stale') setStreamError('')
    },
  ), [symbol])

  useEffect(() => {
    return subscribeToPosition(
      currentUser.uid,
      symbol,
      (nextPosition) => { setPosition(nextPosition); setPositionLoading(false) },
      (requestError) => { setStreamError(getFirestoreErrorMessage(requestError)); setPositionLoading(false) },
    )
  }, [currentUser.uid, symbol])

  useEffect(() => subscribeToSymbolOrders(currentUser.uid, symbol, setPendingOrders, (requestError) => setStreamError(getFirestoreErrorMessage(requestError))), [currentUser.uid, symbol])
  useEffect(() => subscribeToSymbolTrades(currentUser.uid, symbol, setTrades, (requestError) => setStreamError(getFirestoreErrorMessage(requestError))), [currentUser.uid, symbol])

  const stats = useMemo(() => ticker ? [
    ['24h high', formatPrice(ticker.high24h, market)],
    ['24h low', formatPrice(ticker.low24h, market)],
    ['24h volume', formatVolume(ticker.volume24h)],
  ] : [], [market, ticker])
  const forexSession = market.type === 'forex' ? getForexSessionStatus() : null
  const marketOpen = market.type === 'crypto' || Boolean(forexSession?.isOpen && ticker?.marketStatus === 'Open' && ticker?.connectionStatus === 'live' && !ticker?.isStale)
  const selectedTrades = useMemo(() => trades.slice(0, 5), [trades])
  const openOrders = useMemo(() => pendingOrders.filter((order) => order.status === 'pending'), [pendingOrders])
  const chartLevels = useMemo(() => {
    const levels = []
    if (position?.status === 'open') {
      levels.push({ label: 'Entry', price: position.averageEntryPrice, color: '#8b98a8', style: 2 })
      if (position.stopLoss) levels.push({ label: 'SL', price: position.stopLoss, color: '#ea3943', style: 3 })
      if (position.trailingStopEnabled && position.trailingStopPrice) levels.push({ label: 'TRAIL', price: position.trailingStopPrice, color: '#f59e0b', style: 1 })
      if (position.takeProfitTargets?.length) position.takeProfitTargets.filter((target) => target.status === 'pending').forEach((target, index) => levels.push({ label: `TP${index + 1}`, price: target.price, color: '#16c784', style: index % 2 ? 2 : 3 }))
      else if (position.takeProfit) levels.push({ label: 'TP', price: position.takeProfit, color: '#16c784', style: 3 })
    }
    openOrders.forEach((order) => levels.push({ label: `LIMIT ${order.side}`, price: order.limitPrice, color: order.side === 'BUY' ? '#3b82f6' : '#ea3943', style: order.side === 'BUY' ? 1 : 2 }))
    return showTradeLevels ? levels : []
  }, [openOrders, position, showTradeLevels])

  useEffect(() => {
    if (!chartExpanded) return undefined
    const close = (event) => { if (event.key === 'Escape') setChartExpanded(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [chartExpanded])

  const selectSymbol = (nextSymbol) => {
    setLoading(true)
    setTicker(null)
    setStreamError('')
    setPositionLoading(true)
    setConnectionStatus('connecting')
    navigate(`/trade?symbol=${nextSymbol}`, { replace: true })
  }
  const selectInterval = (nextInterval) => { setLoading(true); setIntervalValue(nextInterval) }

  return (
    <div className="space-y-4">
      {invalidSymbol && <div className="rounded-lg border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning" role="status">“{requestedSymbol}” is not supported. Showing BTC/USDT instead.</div>}
      {error && <div className="rounded-lg border border-negative/25 bg-negative/10 px-4 py-3 text-sm text-negative" role="alert">{error}</div>}
      {streamError && <div className="rounded-lg border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning" role="status">{streamError}</div>}
      {tradeNotice && <div className="rounded-lg border border-positive/25 bg-positive/10 px-4 py-3 text-sm text-positive" role="status">{tradeNotice}</div>}
      <Card padding="none">
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
          <div className="w-full lg:w-52"><Select aria-label="Select market" onChange={(event) => selectSymbol(event.target.value)} value={symbol}>{markets.map((item) => <option key={item.symbol} value={item.symbol}>{item.displaySymbol} · {item.category}</option>)}</Select></div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold">{market.displaySymbol}</h1><MarketSourceBadge status={connectionStatus} type={market.type} />{forexSession && <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${forexSession.isOpen ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>{forexSession.displayStatus}</span>}</div><p className="mt-1 text-xs text-muted">{market.name} · {market.type === 'crypto' ? '24/7 instrument' : `${forexSession.status} session · ${forexSession.note}`}</p></div>
          <div><p className="financial-value text-2xl font-semibold">{formatPrice(ticker?.price, market)}</p>{ticker && <PriceChange amount={ticker.change} showAmount value={ticker.changePercent} />}</div>
          <div className="grid grid-cols-3 gap-5">{stats.map(([label, value]) => <div key={label}><p className="text-[10px] uppercase tracking-wider text-muted">{label}</p><p className="financial-value mt-1 text-xs font-semibold">{value}</p></div>)}</div>
        </div>
      </Card>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className={chartExpanded ? 'fixed inset-3 z-50 min-w-0 overflow-auto bg-surface sm:inset-6' : 'min-w-0'} padding="none">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
            <div className="flex items-center gap-2"><ChartCandlestick className="size-4 text-accent" /><span className="text-xs font-semibold">Price chart</span></div>
            <div className="flex flex-wrap items-center gap-1"><button aria-pressed={showTradeLevels} className={`h-8 rounded-md px-2.5 text-[11px] font-semibold ${showTradeLevels ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-elevated'}`} onClick={() => setShowTradeLevels((value) => !value)} type="button">Trade Levels</button>{timeframes.map((item) => <button aria-pressed={interval === item} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${interval === item ? 'bg-accent text-white' : 'text-muted hover:bg-elevated hover:text-foreground'}`} key={item} onClick={() => selectInterval(item)} type="button">{item}</button>)}<TradingCalculator defaultEntry={ticker?.price} walletBalance={wallet?.availableBalance} /><IconButton aria-label="Reset chart view" icon={RotateCcw} onClick={() => setResetSignal((value) => value + 1)} size="sm" title="Reset chart view" /><IconButton aria-label={chartExpanded ? 'Restore chart' : 'Expand chart'} icon={chartExpanded ? Minimize : Maximize} onClick={() => setChartExpanded((value) => !value)} size="sm" title={chartExpanded ? 'Restore chart' : 'Expand chart'} /></div>
          </div>
          {loading ? <div className="grid h-[450px] place-items-center" role="status"><div className="text-center"><Activity className="mx-auto size-6 animate-pulse text-accent" /><p className="mt-2 text-xs text-muted">Loading chart data…</p></div></div> : candles.length ? <Suspense fallback={<div className="grid h-[450px] place-items-center text-sm text-muted">Preparing chart…</div>}><TradingChart data={candles} interval={interval} livePrice={ticker?.price} priceLevels={chartLevels} resetSignal={resetSignal} symbol={symbol} tradeMarkers={trades} /></Suspense> : <div className="grid h-[450px] place-items-center text-sm text-muted">No chart data available.</div>}
        </Card>

        <Card padding="none"><div className="border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Simulated order</h2><p className="mt-1 text-xs text-muted">Long-only · no leverage, margin, or short selling</p></div><OrderPanel market={market} marketOpen={marketOpen} onComplete={setTradeNotice} position={position} ticker={ticker} userId={currentUser.uid} wallet={wallet} /></Card>
      </div>
      {!positionLoading && <OpenPositionPanel market={market} marketOpen={marketOpen} onComplete={setTradeNotice} position={position} ticker={ticker} userId={currentUser.uid} />}
      <PendingOrders market={market} onComplete={setTradeNotice} orders={pendingOrders} userId={currentUser.uid} />
      <RecentTrades market={market} trades={selectedTrades} />
      <Card><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-elevated text-muted"><ShieldCheck className="size-4" /></span><div><h2 className="text-sm font-semibold">Client-side simulated execution</h2><p className="mt-1 text-xs leading-5 text-muted">Fresh provider quotes are requested before fills and closes. Pending orders and stop-loss/take-profit monitoring work only while TradePilot is open and are not exchange-grade protection.</p></div></div></Card>
    </div>
  )
}

export default Trade
