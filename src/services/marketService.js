import { marketBySymbol } from '../data/markets.js'
import {
  BINANCE_MARKET_SOURCE,
  getBinanceHistoricalCandles,
  getBinanceTicker,
  getBinanceTickers,
  subscribeToBinanceTicker,
} from './binanceMarketService.js'
import {
  getMockHistoricalCandles,
  getMockMarketSymbols,
  getMockTicker,
  MOCK_MARKET_SOURCE,
  subscribeToMockTicker,
} from './mockMarketService.js'

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

export const marketSources = { crypto: BINANCE_MARKET_SOURCE, forex: MOCK_MARKET_SOURCE }
export const getMarketSymbols = () => getMockMarketSymbols()

export async function getTicker(symbol) {
  const market = marketFor(symbol)
  if (market.type === 'forex') return getMockTicker(symbol)
  const tickers = await getCachedCryptoTickers()
  return tickers.find((ticker) => ticker.symbol === symbol) || getBinanceTicker(symbol)
}

export function getHistoricalCandles(symbol, interval) {
  return marketFor(symbol).type === 'crypto'
    ? getBinanceHistoricalCandles(symbol, interval)
    : getMockHistoricalCandles(symbol, interval)
}

export function subscribeToTicker(symbol, callback, onError, onStatus) {
  return marketFor(symbol).type === 'crypto'
    ? subscribeToBinanceTicker(symbol, callback, onError, onStatus)
    : subscribeToMockTicker(symbol, callback, onError, onStatus)
}
