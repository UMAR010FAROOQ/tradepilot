import { marketBySymbol, markets } from '../data/markets.js'

export const MOCK_MARKET_SOURCE = 'Demo Forex Data'

const basePrices = {
  BTCUSDT: 68420, ETHUSDT: 3582, BNBUSDT: 612, SOLUSDT: 148, XRPUSDT: 0.526,
  ADAUSDT: 0.452, DOGEUSDT: 0.142, AVAXUSDT: 36.8, LINKUSDT: 17.4, LTCUSDT: 84.2,
  EURUSD: 1.0864, GBPUSD: 1.2748, USDJPY: 156.42, USDCHF: 0.9042, AUDUSD: 0.6624,
  USDCAD: 1.3682, NZDUSD: 0.6142, EURJPY: 169.92, GBPJPY: 199.42, EURGBP: 0.8522,
}

const intervalSeconds = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 }

function hash(text) {
  return [...text].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 2166136261)
}

function random(seed) {
  let value = seed || 1
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

export async function getMockMarketSymbols() {
  return markets
}

export async function getMockHistoricalCandles(symbol, interval = '1h') {
  const market = marketBySymbol.get(symbol)
  if (!market) throw new Error(`Unsupported market symbol: ${symbol}`)
  const step = intervalSeconds[interval] || intervalSeconds['1h']
  const generator = random(hash(`${symbol}-${interval}`))
  const count = 240
  const anchor = Math.floor(Date.now() / step) * step
  const volatility = market.type === 'crypto' ? 0.008 : 0.0012
  let close = basePrices[symbol]
  const candles = []

  for (let index = count - 1; index >= 0; index -= 1) {
    const open = close
    const movement = (generator() - 0.48) * volatility
    close = Math.max(open * (1 + movement), open * 0.1)
    const spread = open * volatility * (0.15 + generator() * 0.55)
    candles.push({
      time: anchor - index * step,
      open,
      high: Math.max(open, close) + spread,
      low: Math.min(open, close) - spread,
      close,
      volume: Math.round((market.type === 'crypto' ? 18000000 : 85000000) * (0.35 + generator())),
    })
  }
  return candles
}

export async function getMockTicker(symbol) {
  const market = marketBySymbol.get(symbol)
  if (!market) throw new Error(`Unsupported market symbol: ${symbol}`)
  const candles = await getMockHistoricalCandles(symbol, '1h')
  const latest = candles.at(-1)
  const comparison = candles.at(-25)
  const change = latest.close - comparison.open
  return {
    ...market,
    price: latest.close,
    change,
    changePercent: (change / comparison.open) * 100,
    high24h: Math.max(...candles.slice(-24).map((item) => item.high)),
    low24h: Math.min(...candles.slice(-24).map((item) => item.low)),
    volume24h: candles.slice(-24).reduce((total, item) => total + item.volume, 0),
    source: MOCK_MARKET_SOURCE,
    connectionStatus: 'demo',
  }
}

export function subscribeToMockTicker(symbol, callback, onError, onStatus) {
  let active = true
  onStatus?.('demo')
  const publish = () => getMockTicker(symbol).then((ticker) => active && callback({ ...ticker, connectionStatus: 'demo' })).catch(onError)
  publish()
  const timer = window.setInterval(publish, 15000)
  return () => { active = false; window.clearInterval(timer) }
}
