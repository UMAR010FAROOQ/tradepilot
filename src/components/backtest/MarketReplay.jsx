import { useEffect, useMemo, useState } from 'react'
import { Pause, Play, RotateCcw, StepForward } from 'lucide-react'
import Button from '../common/Button.jsx'
import Select from '../common/Select.jsx'
import TradingChart from '../charts/TradingChart.jsx'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { formatPrice } from '../../utils/marketFormatters.js'

function timestamp(time) { return { toDate: () => new Date(time * 1000) } }
function MarketReplay({ result, market }) {
  const [index, setIndex] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState('1')
  useEffect(() => {
    if (!playing) return undefined
    if (index >= result.candles.length - 1) return undefined
    const timer = window.setTimeout(() => { const next = index + 1; setIndex(next); if (next >= result.candles.length - 1) setPlaying(false) }, Math.max(100, 1000 / Number(speed)))
    return () => window.clearTimeout(timer)
  }, [index, playing, result.candles.length, speed])
  const frame = result.replayFrames[index], visibleCandles = result.candles.slice(0, index + 1)
  const markers = useMemo(() => result.trades.flatMap((trade) => [{ side: 'BUY', createdAt: timestamp(trade.entryTime) }, { side: 'SELL', createdAt: timestamp(trade.exitTime) }]).filter((marker) => marker.createdAt.toDate().getTime() / 1000 <= result.candles[index].time), [index, result.candles, result.trades])
  const info = frame.info || {}
  return <section><div className="flex flex-col justify-between gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center"><div><h2 className="text-sm font-semibold">Backtest Market Replay</h2><p className="mt-1 text-xs text-muted">Candle {index + 1} of {result.candles.length}</p></div><div className="flex flex-wrap items-end gap-2"><Button onClick={() => setPlaying((value) => !value)} size="sm" variant="secondary">{playing ? <Pause className="size-4" /> : <Play className="size-4" />}{playing ? 'Pause' : 'Play'}</Button><Button disabled={playing || index >= result.candles.length - 1} onClick={() => setIndex((value) => Math.min(value + 1, result.candles.length - 1))} size="sm" variant="secondary"><StepForward className="size-4" />Step</Button><Button onClick={() => { setPlaying(false); setIndex(0) }} size="sm" variant="ghost"><RotateCcw className="size-4" />Reset</Button><Select aria-label="Replay speed" className="w-20" onChange={(event) => setSpeed(event.target.value)} value={speed}>{['1', '2', '5', '10'].map((value) => <option key={value} value={value}>{value}x</option>)}</Select></div></div><TradingChart data={visibleCandles} interval={result.configuration.interval} symbol={market.symbol} tradeMarkers={markers} />
    <div className="grid gap-px border-t border-border bg-border sm:grid-cols-4 xl:grid-cols-7">{[['Signal', frame.signal], ['Cash', formatCurrency(frame.cash)], ['Quantity', frame.position?.quantity?.toFixed(6) || '—'], ['Entry', frame.position ? formatPrice(frame.position.entryPrice, market) : '—'], ['Current value', formatCurrency(frame.currentValue)], ['Unrealized P/L', formatCurrency(frame.unrealizedPnl)], ['Current equity', formatCurrency(frame.equity)]].map(([label, value]) => <div className="min-w-0 bg-surface p-3" key={label}><p className="text-[10px] text-muted">{label}</p><p className="financial-value mt-1 truncate text-xs font-semibold">{value}</p></div>)}</div>
    <div className="flex flex-wrap gap-4 border-t border-border px-5 py-3 text-[10px] text-muted"><span>Realized P/L: <b className="financial-value text-foreground">{formatCurrency(frame.realizedPnl)}</b></span>{info.fastMA !== undefined && <><span>Fast MA: {info.fastMA?.toFixed(5) || '—'}</span><span>Slow MA: {info.slowMA?.toFixed(5) || '—'}</span></>}{info.rsi !== undefined && <span>RSI: {info.rsi?.toFixed(2) || '—'}</span>}{info.breakoutLevel !== undefined && <span>Breakout level: {info.breakoutLevel ? formatPrice(info.breakoutLevel, market) : '—'}</span>}</div>
  </section>
}
export default MarketReplay
