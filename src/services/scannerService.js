import { getCachedHistoricalCandles } from './marketService.js'
import { analyzeScannerCandles } from '../utils/scannerAnalysis.js'

const FOREX_QUEUE_GAP_MS = 8000
const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration))

async function analyzeOne(market, interval, ticker, force) {
  try {
    const candles = await getCachedHistoricalCandles(market.symbol, interval, { force })
    return { symbol: market.symbol, state: 'ready', analysis: analyzeScannerCandles(candles, ticker) }
  } catch (error) {
    return { symbol: market.symbol, state: error?.message?.includes('Insufficient') ? 'insufficient' : 'unavailable', error: error?.message || 'Historical analysis is unavailable.' }
  }
}

export async function analyzeScannerMarkets({ markets, interval, tickers, force = false, onResult, isCancelled = () => false }) {
  const crypto = markets.filter((market) => market.type === 'crypto'), forex = markets.filter((market) => market.type === 'forex')
  for (let index = 0; index < crypto.length; index += 4) {
    if (isCancelled()) return
    const results = await Promise.all(crypto.slice(index, index + 4).map((market) => analyzeOne(market, interval, tickers.get(market.symbol), force)))
    if (isCancelled()) return
    results.forEach(onResult)
  }
  for (let index = 0; index < forex.length; index += 1) {
    if (isCancelled()) return
    const result = await analyzeOne(forex[index], interval, tickers.get(forex[index].symbol), force)
    if (isCancelled()) return
    onResult(result)
    if (index < forex.length - 1) { await wait(FOREX_QUEUE_GAP_MS); if (isCancelled()) return }
  }
}
