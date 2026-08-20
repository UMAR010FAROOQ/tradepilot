import {
  getMockHistoricalCandles,
  getMockMarketSymbols,
  getMockTicker,
  MOCK_MARKET_SOURCE,
  subscribeToMockTicker,
} from './mockMarketService.js'

const provider = {
  getMarketSymbols: getMockMarketSymbols,
  getTicker: getMockTicker,
  getHistoricalCandles: getMockHistoricalCandles,
  subscribeToTicker: subscribeToMockTicker,
}

export const marketDataSource = MOCK_MARKET_SOURCE
export const getMarketSymbols = () => provider.getMarketSymbols()
export const getTicker = (symbol) => provider.getTicker(symbol)
export const getHistoricalCandles = (symbol, interval) => provider.getHistoricalCandles(symbol, interval)
export const subscribeToTicker = (symbol, callback) => provider.subscribeToTicker(symbol, callback)
