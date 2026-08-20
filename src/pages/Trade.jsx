import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Activity, ChartCandlestick, Clock, Maximize, Settings } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import Select from '../components/common/Select.jsx'
import PriceChange from '../components/trading/PriceChange.jsx'
import { marketBySymbol, markets } from '../data/markets.js'
import { getHistoricalCandles, marketDataSource, subscribeToTicker } from '../services/marketService.js'
import { formatPrice, formatVolume } from '../utils/marketFormatters.js'

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
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    getHistoricalCandles(symbol, interval)
      .then((items) => { if (active) { setCandles(items); setError('') } })
      .catch(() => active && setError('Chart data could not be loaded.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [interval, symbol])

  useEffect(() => subscribeToTicker(symbol, setTicker), [symbol])

  const stats = useMemo(() => ticker ? [
    ['24h high', formatPrice(ticker.high24h, market)],
    ['24h low', formatPrice(ticker.low24h, market)],
    ['24h volume', formatVolume(ticker.volume24h)],
  ] : [], [market, ticker])

  const selectSymbol = (nextSymbol) => {
    setLoading(true)
    navigate(`/trade?symbol=${nextSymbol}`, { replace: true })
  }
  const selectInterval = (nextInterval) => { setLoading(true); setIntervalValue(nextInterval) }

  return (
    <div className="space-y-4">
      {invalidSymbol && <div className="rounded-lg border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning" role="status">“{requestedSymbol}” is not supported. Showing BTC/USDT instead.</div>}
      {error && <div className="rounded-lg border border-negative/25 bg-negative/10 px-4 py-3 text-sm text-negative" role="alert">{error}</div>}
      <Card padding="none">
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
          <div className="w-full lg:w-52"><Select aria-label="Select market" onChange={(event) => selectSymbol(event.target.value)} value={symbol}>{markets.map((item) => <option key={item.symbol} value={item.symbol}>{item.displaySymbol} · {item.category}</option>)}</Select></div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold">{market.displaySymbol}</h1><Badge variant="warning">{marketDataSource}</Badge></div><p className="mt-1 text-xs text-muted">{market.name} · {market.type === 'crypto' ? '24/7 instrument' : 'Demo session'}</p></div>
          <div><p className="financial-value text-2xl font-semibold">{formatPrice(ticker?.price, market)}</p>{ticker && <PriceChange amount={ticker.change} showAmount value={ticker.changePercent} />}</div>
          <div className="grid grid-cols-3 gap-5">{stats.map(([label, value]) => <div key={label}><p className="text-[10px] uppercase tracking-wider text-muted">{label}</p><p className="financial-value mt-1 text-xs font-semibold">{value}</p></div>)}</div>
        </div>
      </Card>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0" padding="none">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
            <div className="flex items-center gap-2"><ChartCandlestick className="size-4 text-accent" /><span className="text-xs font-semibold">Price chart</span></div>
            <div className="flex items-center gap-1">{timeframes.map((item) => <button aria-pressed={interval === item} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${interval === item ? 'bg-accent text-white' : 'text-muted hover:bg-elevated hover:text-foreground'}`} key={item} onClick={() => selectInterval(item)} type="button">{item}</button>)}<Button aria-label="Chart settings placeholder" className="ml-1 size-8 px-0" size="sm" title="Chart settings" variant="ghost"><Settings className="size-4" /></Button><Button aria-label="Maximize chart placeholder" className="size-8 px-0" size="sm" title="Maximize chart" variant="ghost"><Maximize className="size-4" /></Button></div>
          </div>
          {loading ? <div className="grid h-[450px] place-items-center" role="status"><div className="text-center"><Activity className="mx-auto size-6 animate-pulse text-accent" /><p className="mt-2 text-xs text-muted">Loading chart data…</p></div></div> : candles.length ? <Suspense fallback={<div className="grid h-[450px] place-items-center text-sm text-muted">Preparing chart…</div>}><TradingChart data={candles} interval={interval} symbol={symbol} /></Suspense> : <div className="grid h-[450px] place-items-center text-sm text-muted">No chart data available.</div>}
        </Card>

        <Card padding="none">
          <div className="border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Order panel</h2><p className="mt-1 text-xs text-muted">Trading is not enabled in this phase.</p></div>
          <div className="space-y-4 p-5"><div className="grid grid-cols-2 gap-2"><Button disabled variant="success">Buy</Button><Button disabled variant="danger">Sell</Button></div><label className="grid gap-1.5 text-xs font-medium">Order type<select className="h-10 rounded-lg border border-border bg-elevated px-3 text-sm text-muted" disabled><option>Market</option></select></label><label className="grid gap-1.5 text-xs font-medium">Amount<input className="h-10 rounded-lg border border-border bg-elevated px-3 text-sm text-muted" disabled placeholder="0.00" /></label><Button disabled fullWidth>Place demo order</Button><p className="text-xs leading-5 text-muted">No position, wallet, or execution records will be created.</p></div>
        </Card>
      </div>

      <Card><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-elevated text-muted"><Clock className="size-4" /></span><div><h2 className="text-sm font-semibold">Market statistics and positions</h2><p className="mt-1 text-xs text-muted">Reserved for a future trading-engine phase.</p></div></div></Card>
    </div>
  )
}

export default Trade
