import { atr, rollingPrevious, sma } from './indicators.js'

export function analyzeScannerCandles(candles, ticker) {
  if (!Array.isArray(candles) || candles.length < 50) throw new Error('Insufficient historical candles.')
  const closes = candles.map((candle) => candle.close), fastValues = sma(closes, 20), slowValues = sma(closes, 50)
  const fastMA = fastValues.at(-1), slowMA = slowValues.at(-1)
  const trendGap = fastMA !== null && slowMA !== null && slowMA ? (fastMA - slowMA) / slowMA * 100 : null
  const trend = trendGap === null ? 'Analyzing' : Math.abs(trendGap) < 0.1 ? 'Neutral' : trendGap > 0 ? 'Bullish' : 'Bearish'
  const recentBase = closes.at(-11), recentReturn = recentBase ? (closes.at(-1) - recentBase) / recentBase * 100 : null
  const atrValue = atr(candles, 14), referencePrice = ticker?.price || closes.at(-1)
  const volatility = atrValue && referencePrice ? atrValue / referencePrice * 100 : null
  const breakoutLevel = rollingPrevious(candles, candles.length - 1, 20, 'high', 'highest')
  const breakoutDistance = breakoutLevel && referencePrice ? (referencePrice - breakoutLevel) / breakoutLevel * 100 : null
  const breakoutStatus = breakoutDistance === null ? 'Analyzing' : breakoutDistance > 0 ? 'Breakout' : breakoutDistance >= -1 ? 'Near Breakout' : 'Inside Range'
  return { fastMA, slowMA, trend, recentReturn, atr: atrValue, volatility, breakoutLevel, breakoutDistance, breakoutStatus, candleCount: candles.length }
}

export function buildScannerRow(market, ticker, analysis, state = 'pending') {
  const changePercent = Number.isFinite(ticker?.changePercent) ? ticker.changePercent : null
  const referencePrice = ticker?.price || null
  const volatility = analysis?.atr && referencePrice ? analysis.atr / referencePrice * 100 : analysis?.volatility ?? null
  const breakoutDistance = analysis?.breakoutLevel && referencePrice ? (referencePrice - analysis.breakoutLevel) / analysis.breakoutLevel * 100 : analysis?.breakoutDistance ?? null
  const breakoutStatus = breakoutDistance === null ? analysis?.breakoutStatus : breakoutDistance > 0 ? 'Breakout' : breakoutDistance >= -1 ? 'Near Breakout' : 'Inside Range'
  const momentum = analysis && (changePercent !== null || analysis.recentReturn !== null) ? (changePercent || 0) + (analysis.recentReturn || 0) : null
  const trendScore = analysis?.trend === 'Bullish' ? 2 : analysis?.trend === 'Bearish' ? -2 : 0
  const breakoutScore = breakoutDistance === null || breakoutDistance === undefined ? 0 : Math.max(-2, Math.min(2, breakoutDistance + 1))
  return { ...market, ticker, analysis: analysis ? { ...analysis, volatility, breakoutDistance, breakoutStatus } : null, analysisState: state, changePercent, momentum, scannerScore: momentum === null ? null : momentum + trendScore + breakoutScore }
}
