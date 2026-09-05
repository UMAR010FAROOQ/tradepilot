import { useEffect, useRef } from 'react'
import { CandlestickSeries, ColorType, CrosshairMode, LineStyle, createChart } from 'lightweight-charts'
import { marketBySymbol } from '../../data/markets.js'

function TradingChart({ data, symbol, interval, livePrice, priceLevels = [], resetSignal = 0, className = '' }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const priceLinesRef = useRef([])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#0d1117' },
        textColor: '#8b98a8',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: '#18202b' },
        horzLines: { color: '#18202b' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#202936', scaleMargins: { top: 0.12, bottom: 0.08 } },
      timeScale: { borderColor: '#202936', timeVisible: true, secondsVisible: false, rightOffset: 6 },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
      handleScroll: { horzTouchDrag: true, mouseWheel: true, pressedMouseMove: true },
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#16c784', downColor: '#ea3943',
      wickUpColor: '#16c784', wickDownColor: '#ea3943',
      borderUpColor: '#16c784', borderDownColor: '#ea3943',
      priceLineVisible: true,
      priceLineColor: '#3b82f6',
      priceLineStyle: LineStyle.Dashed,
    })
    chartRef.current = chart
    seriesRef.current = series

    const observer = new ResizeObserver(() => chart.resize(container.clientWidth, container.clientHeight))
    observer.observe(container)
    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return
    const market = marketBySymbol.get(symbol)
    const precision = market?.type === 'forex' ? (symbol.includes('JPY') ? 3 : 5) : undefined
    if (precision) seriesRef.current.applyOptions({ priceFormat: { type: 'price', precision, minMove: 10 ** -precision } })
    seriesRef.current.setData(data)
    chartRef.current.timeScale().fitContent()
  }, [data, symbol, interval])

  useEffect(() => {
    if (!seriesRef.current) return
    priceLinesRef.current.forEach((line) => seriesRef.current.removePriceLine(line))
    priceLinesRef.current = priceLevels.filter((level) => Number.isFinite(level.price)).map((level) => seriesRef.current.createPriceLine({
      price: level.price,
      color: level.color,
      lineWidth: 1,
      lineStyle: level.style ?? LineStyle.Dashed,
      axisLabelVisible: true,
      title: level.label,
    }))
  }, [priceLevels])

  useEffect(() => {
    if (resetSignal) chartRef.current?.timeScale().fitContent()
  }, [resetSignal])

  useEffect(() => {
    const latest = data.at(-1)
    if (!seriesRef.current || !latest || !Number.isFinite(livePrice)) return
    seriesRef.current.update({
      ...latest,
      close: livePrice,
      high: Math.max(latest.high, livePrice),
      low: Math.min(latest.low, livePrice),
    })
  }, [data, livePrice])

  return (
    <div className={className}>
      <div aria-label={`${symbol} ${interval} candlestick chart`} className="h-[420px] min-h-72 w-full" ref={containerRef} role="img" />
      <p className="border-t border-border px-3 py-2 text-right text-[10px] text-muted">Charts powered by <a className="hover:text-foreground" href="https://www.tradingview.com/" rel="noreferrer" target="_blank">TradingView</a></p>
    </div>
  )
}

export default TradingChart
