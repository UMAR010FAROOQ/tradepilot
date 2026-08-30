import { marketBySymbol, markets } from '../data/markets.js'
import { createServiceError } from '../utils/firestoreErrors.js'
import { getForexSessionStatus } from '../utils/forexSession.js'
import {
  getMockHistoricalCandles,
  getMockTicker,
  MOCK_MARKET_SOURCE,
} from './mockMarketService.js'

const POLL_INTERVAL_MS = 20000
const POLL_BATCH_SIZE = 2
export const FOREX_FRESHNESS_THRESHOLD_MS = Math.max(120000, Math.ceil(markets.filter((market) => market.type === 'forex').length / POLL_BATCH_SIZE) * POLL_INTERVAL_MS + 20000)
export const FOREX_MARKET_SOURCE = 'Twelve Data'

const configuredBaseUrl = (import.meta.env.VITE_FOREX_API_BASE_URL || '').trim().replace(/\/$/, '')
const forexMarkets = markets.filter((market) => market.type === 'forex')
const intervalMap = { '1m': '1min', '5m': '5min', '15m': '15min', '1h': '1h', '4h': '4h', '1d': '1day' }
const subscribers = new Map()
const tickerCache = new Map()
let pollTimer = null
let initialPollTimer = null
let pollPromise = null
let pollCursor = 0

export const isForexLiveConfigured = Boolean(configuredBaseUrl)

function marketFor(symbol) {
  const market = marketBySymbol.get(symbol)
  if (!market || market.type !== 'forex') throw createServiceError('forex/unsupported-symbol', 'This Forex market is not supported.')
  return market
}

function providerSymbol(symbol) {
  const market = marketFor(symbol)
  return `${market.baseAsset}/${market.quoteAsset}`
}

async function request(path, parameters) {
  if (!isForexLiveConfigured) throw createServiceError('forex/not-configured', 'Live Forex data is not configured.')
  const url = new URL(`${configuredBaseUrl}${path}`)
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value))
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw createServiceError('forex/provider-unavailable', `Forex data request failed (${response.status}).`)
  const payload = await response.json()
  if (payload?.status === 'error' || payload?.code >= 400) throw createServiceError('forex/provider-unavailable', payload.message || 'Forex data is unavailable.')
  return payload
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const result = Number(value)
  return Number.isFinite(result) ? result : null
}

function timestampFrom(payload) {
  const lastQuoteAt = Number(payload.last_quote_at)
  const timestamp = Number.isFinite(lastQuoteAt) && lastQuoteAt > 0
    ? lastQuoteAt
    : Number(payload.timestamp)
  if (Number.isFinite(timestamp) && timestamp > 0) return timestamp * 1000
  if (!payload.datetime) return null
  const normalized = payload.datetime.includes('T') ? payload.datetime : payload.datetime.replace(' ', 'T')
  const parsed = Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(normalized) ? normalized : `${normalized}Z`)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeTicker(payload, symbol) {
  const market = marketFor(symbol)
  const price = numberOrNull(payload.close ?? payload.price)
  const previousClose = numberOrNull(payload.previous_close)
  const change = numberOrNull(payload.change) ?? (price !== null && previousClose !== null ? price - previousClose : null)
  const changePercent = numberOrNull(payload.percent_change) ?? (change !== null && previousClose ? (change / previousClose) * 100 : null)
  const lastUpdated = timestampFrom(payload)
  if (price === null || lastUpdated === null) throw createServiceError('forex/provider-unavailable', 'Forex quote data is incomplete.')
  const session = getForexSessionStatus()
  const isStale = session.isOpen && Date.now() - lastUpdated > FOREX_FRESHNESS_THRESHOLD_MS

  return {
    ...market,
    price,
    change,
    changePercent,
    high24h: numberOrNull(payload.high),
    low24h: numberOrNull(payload.low),
    volume24h: numberOrNull(payload.volume),
    source: FOREX_MARKET_SOURCE,
    status: session.status,
    marketStatus: session.displayStatus,
    lastUpdated,
    isStale,
    providerMarketOpen: typeof payload.is_market_open === 'boolean' ? payload.is_market_open : null,
    connectionStatus: isStale ? 'stale' : 'live',
  }
}

function extractQuote(payload, symbol) {
  if (payload?.symbol || payload?.close || payload?.price) return payload
  return payload?.[providerSymbol(symbol)] || payload?.[symbol]
}

async function fetchTickers(symbols) {
  const uniqueSymbols = [...new Set(symbols)]
  const payload = await request('/quote', { symbol: uniqueSymbols.map(providerSymbol).join(',') })
  return uniqueSymbols.map((symbol) => normalizeTicker(extractQuote(payload, symbol) || {}, symbol))
}

async function demoTicker(symbol) {
  if (symbol === 'XAUUSD') throw createServiceError('forex/live-required', 'Live Gold data is currently unavailable.')
  const ticker = await getMockTicker(symbol)
  const session = getForexSessionStatus()
  return {
    ...ticker,
    volume24h: null,
    source: MOCK_MARKET_SOURCE,
    status: session.status,
    marketStatus: session.displayStatus,
    lastUpdated: Date.now(),
    isStale: false,
    connectionStatus: 'demo',
  }
}

function notifyStatus(status) {
  subscribers.forEach((entries) => entries.forEach((entry) => entry.onStatus?.(status)))
}

function aggregateStatus() {
  if (!isForexLiveConfigured) return 'demo'
  const tickers = [...subscribers.keys()].map((symbol) => tickerCache.get(symbol))
  if (tickers.some((ticker) => !ticker)) return 'connecting'
  if (tickers.some((ticker) => ticker.connectionStatus === 'demo')) return 'demo'
  if (tickers.some((ticker) => ticker.isStale)) return 'stale'
  return 'live'
}

async function pollSubscribers() {
  if (pollPromise || subscribers.size === 0) return pollPromise
  const subscribedSymbols = [...subscribers.keys()]
  const symbols = subscribedSymbols.length <= POLL_BATCH_SIZE
    ? subscribedSymbols
    : Array.from({ length: POLL_BATCH_SIZE }, (_, index) => subscribedSymbols[(pollCursor + index) % subscribedSymbols.length])
  pollCursor = (pollCursor + symbols.length) % subscribedSymbols.length
  pollPromise = (isForexLiveConfigured ? fetchTickers(symbols) : Promise.all(symbols.map(demoTicker)))
    .then((tickers) => {
      tickers.forEach((ticker) => {
        tickerCache.set(ticker.symbol, ticker)
        subscribers.get(ticker.symbol)?.forEach((entry) => entry.callback(ticker))
      })
      notifyStatus(aggregateStatus())
    })
    .catch(async (error) => {
      notifyStatus('unavailable')
      symbols.forEach((symbol) => subscribers.get(symbol)?.forEach((entry) => entry.onError?.(error)))
      if (isForexLiveConfigured) {
        const fallbackTickers = await Promise.all(symbols.filter((symbol) => symbol !== 'XAUUSD').map(demoTicker))
        fallbackTickers.forEach((ticker) => {
          tickerCache.set(ticker.symbol, ticker)
          subscribers.get(ticker.symbol)?.forEach((entry) => entry.callback(ticker))
        })
        notifyStatus(aggregateStatus())
      }
    })
    .finally(() => { pollPromise = null })
  return pollPromise
}

function ensurePolling() {
  if (pollTimer || subscribers.size === 0) return
  initialPollTimer = window.setTimeout(() => {
    initialPollTimer = null
    pollSubscribers()
  }, 0)
  pollTimer = window.setInterval(pollSubscribers, POLL_INTERVAL_MS)
}

export function getForexMarketSymbols() {
  return forexMarkets
}

export async function getForexTicker(symbol, options = {}) {
  marketFor(symbol)
  if (!isForexLiveConfigured) {
    if (options.forExecution) throw createServiceError('forex/live-required', 'Live Forex data is required to place a simulated Forex order.')
    return demoTicker(symbol)
  }
  const session = getForexSessionStatus()
  if (options.forExecution && !session.isOpen) throw createServiceError('forex/market-closed', 'Forex market is currently closed.')
  const [ticker] = await fetchTickers([symbol])
  tickerCache.set(symbol, ticker)
  if (options.forExecution && ticker.isStale) throw createServiceError('forex/stale-price', 'The latest Forex price is stale. Please try again later.')
  return ticker
}

export async function getForexHistoricalCandles(symbol, interval = '1h') {
  marketFor(symbol)
  if (!isForexLiveConfigured) {
    if (symbol === 'XAUUSD') throw createServiceError('forex/live-required', 'Live Gold chart data is currently unavailable.')
    return getMockHistoricalCandles(symbol, interval)
  }
  const providerInterval = intervalMap[interval]
  if (!providerInterval) throw createServiceError('forex/unsupported-interval', 'This Forex chart interval is not supported.')
  const payload = await request('/time_series', { symbol: providerSymbol(symbol), interval: providerInterval, outputsize: '500', order: 'ASC', timezone: 'UTC' })
  if (!Array.isArray(payload?.values)) throw createServiceError('forex/provider-unavailable', 'Forex chart data is unavailable.')
  const candles = payload.values.map((item) => ({
    time: Math.floor(timestampFrom(item) / 1000),
    open: Number(item.open),
    high: Number(item.high),
    low: Number(item.low),
    close: Number(item.close),
    volume: numberOrNull(item.volume),
  })).filter((item) => Number.isFinite(item.time) && Number.isFinite(item.open) && Number.isFinite(item.high) && Number.isFinite(item.low) && Number.isFinite(item.close))
  return [...new Map(candles.map((candle) => [candle.time, candle])).values()]
    .sort((first, second) => first.time - second.time)
}

export function subscribeToForexTicker(symbol, callback, onError, onStatus) {
  marketFor(symbol)
  if (!subscribers.has(symbol)) subscribers.set(symbol, new Set())
  const entry = { callback, onError, onStatus }
  subscribers.get(symbol).add(entry)
  const cached = tickerCache.get(symbol)
  if (cached) callback(cached)
  onStatus?.(isForexLiveConfigured ? 'connecting' : 'demo')
  ensurePolling()

  return () => {
    const entries = subscribers.get(symbol)
    entries?.delete(entry)
    if (entries?.size === 0) subscribers.delete(symbol)
    if (subscribers.size === 0) {
      window.clearInterval(pollTimer)
      window.clearTimeout(initialPollTimer)
      pollTimer = null
      initialPollTimer = null
      pollCursor = 0
    }
  }
}
