import { marketBySymbol, markets } from '../data/markets.js'
import {
  BINANCE_MARKET_SOURCE,
  getBinanceHistoricalCandles,
  getBinanceTicker,
  getBinanceTickers,
  subscribeToBinanceTicker,
} from './binanceMarketService.js'
import {
  FOREX_MARKET_SOURCE,
  getForexHistoricalCandles,
  getForexTicker,
  subscribeToForexTicker,
} from './forexMarketService.js'

const BULK_TICKER_TTL = 10000
let bulkTickerPromise = null
let bulkTickerExpiresAt = 0

function marketFor(symbol) {
  const market = marketBySymbol.get(symbol)
  if (!market) throw new Error(`Unsupported market symbol: ${symbol}`)
  return market
}

async function getCachedCryptoTickers() {
  if (!bulkTickerPromise || Date.now() >= bulkTickerExpiresAt) {
    bulkTickerExpiresAt = Date.now() + BULK_TICKER_TTL
    bulkTickerPromise = getBinanceTickers().catch((error) => {
      bulkTickerPromise = null
      bulkTickerExpiresAt = 0
      throw error
    })
  }
  return bulkTickerPromise
}

export const marketSources = { crypto: BINANCE_MARKET_SOURCE, forex: FOREX_MARKET_SOURCE }
export const getMarketSymbols = async () => markets

export async function getTicker(symbol, options) {
  const market = marketFor(symbol)
  if (market.type === 'forex') return getForexTicker(symbol, options)
  const tickers = await getCachedCryptoTickers()
  return tickers.find((ticker) => ticker.symbol === symbol) || getBinanceTicker(symbol)
}

export function getHistoricalCandles(symbol, interval) {
  return marketFor(symbol).type === 'crypto'
    ? getBinanceHistoricalCandles(symbol, interval)
    : getForexHistoricalCandles(symbol, interval)
}

export function subscribeToTicker(symbol, callback, onError, onStatus) {
  return marketFor(symbol).type === 'crypto'
    ? subscribeToBinanceTicker(symbol, callback, onError, onStatus)
    : subscribeToForexTicker(symbol, callback, onError, onStatus)
}
