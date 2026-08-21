import { marketBySymbol, markets } from '../data/markets.js'

const REST_BASE = 'https://api.binance.com'
const STREAM_BASE = 'wss://stream.binance.com:9443/stream?streams='
const MAX_RETRIES = 8
const MAX_RETRY_DELAY = 30000
const cryptoSymbols = markets.filter((market) => market.type === 'crypto').map((market) => market.symbol)
const streamNames = cryptoSymbols.map((symbol) => `${symbol.toLowerCase()}@ticker`).join('/')

export const BINANCE_MARKET_SOURCE = 'Binance Market Data'

let tickerSocket = null
let reconnectTimer = null
let stabilityTimer = null
let retryCount = 0
let intentionalClose = false
const subscribers = new Map()

function ensureCryptoSymbol(symbol) {
  const market = marketBySymbol.get(symbol)
  if (!market || market.type !== 'crypto') throw new Error(`Unsupported Binance symbol: ${symbol}`)
  return market
}

async function request(path) {
  const response = await fetch(`${REST_BASE}${path}`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Binance market data request failed (${response.status}).`)
  return response.json()
}

function normalizeTicker(payload) {
  const symbol = payload.symbol || payload.s
  const market = ensureCryptoSymbol(symbol)
  return {
    ...market,
    price: Number(payload.lastPrice ?? payload.c),
    change: Number(payload.priceChange ?? payload.p),
    changePercent: Number(payload.priceChangePercent ?? payload.P),
    high24h: Number(payload.highPrice ?? payload.h),
    low24h: Number(payload.lowPrice ?? payload.l),
    volume24h: Number(payload.quoteVolume ?? payload.q),
    source: BINANCE_MARKET_SOURCE,
    connectionStatus: 'live',
  }
}

export async function getBinanceTicker(symbol) {
  ensureCryptoSymbol(symbol)
  const payload = await request(`/api/v3/ticker/24hr?symbol=${encodeURIComponent(symbol)}`)
  return normalizeTicker(payload)
}

export async function getBinanceTickers(symbols = cryptoSymbols) {
  const uniqueSymbols = [...new Set(symbols)]
  uniqueSymbols.forEach(ensureCryptoSymbol)
  const encodedSymbols = encodeURIComponent(JSON.stringify(uniqueSymbols))
  const payload = await request(`/api/v3/ticker/24hr?symbols=${encodedSymbols}&type=FULL`)
  return payload.map(normalizeTicker)
}

export async function getBinanceHistoricalCandles(symbol, interval = '1h') {
  ensureCryptoSymbol(symbol)
  const supportedIntervals = new Set(['1m', '5m', '15m', '1h', '4h', '1d'])
  if (!supportedIntervals.has(interval)) throw new Error(`Unsupported Binance interval: ${interval}`)
  const payload = await request(`/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=400`)
  return payload.map((item) => ({
    time: Math.floor(Number(item[0]) / 1000),
    open: Number(item[1]),
    high: Number(item[2]),
    low: Number(item[3]),
    close: Number(item[4]),
    volume: Number(item[5]),
  })).sort((first, second) => first.time - second.time)
}

function notifyStatus(status) {
  subscribers.forEach((entries) => entries.forEach((entry) => entry.onStatus?.(status)))
}

function notifyError(error) {
  subscribers.forEach((entries) => entries.forEach((entry) => entry.onError?.(error)))
}

function subscriberCount() {
  return [...subscribers.values()].reduce((count, entries) => count + entries.size, 0)
}

function scheduleReconnect() {
  if (intentionalClose || subscriberCount() === 0) return
  if (retryCount >= MAX_RETRIES) {
    notifyStatus('unavailable')
    notifyError(new Error('Binance live market stream is unavailable.'))
    return
  }
  const delay = Math.min(1000 * (2 ** retryCount), MAX_RETRY_DELAY)
  retryCount += 1
  notifyStatus('reconnecting')
  reconnectTimer = window.setTimeout(connectTickerSocket, delay)
}

function connectTickerSocket() {
  if (tickerSocket || subscriberCount() === 0) return
  intentionalClose = false
  notifyStatus(retryCount ? 'reconnecting' : 'connecting')
  const socket = new WebSocket(`${STREAM_BASE}${streamNames}`)
  tickerSocket = socket

  socket.addEventListener('open', () => {
    if (tickerSocket !== socket) return
    notifyStatus('live')
    window.clearTimeout(stabilityTimer)
    stabilityTimer = window.setTimeout(() => { retryCount = 0 }, 30000)
  })
  socket.addEventListener('message', (event) => {
    if (tickerSocket !== socket) return
    try {
      const payload = JSON.parse(event.data)?.data
      const entries = subscribers.get(payload?.s)
      if (!entries) return
      const ticker = normalizeTicker(payload)
      entries.forEach((entry) => entry.callback(ticker))
    } catch {
      notifyError(new Error('A Binance live market update could not be processed.'))
    }
  })
  socket.addEventListener('error', () => {
    if (tickerSocket === socket) notifyError(new Error('Binance live market connection encountered an error.'))
  })
  socket.addEventListener('close', () => {
    if (tickerSocket !== socket) return
    window.clearTimeout(stabilityTimer)
    stabilityTimer = null
    tickerSocket = null
    scheduleReconnect()
  })
}

export function subscribeToBinanceTicker(symbol, callback, onError, onStatus) {
  ensureCryptoSymbol(symbol)
  const wasEmpty = subscriberCount() === 0
  if (!subscribers.has(symbol)) subscribers.set(symbol, new Set())
  const entry = { callback, onError, onStatus }
  subscribers.get(symbol).add(entry)
  if (wasEmpty) retryCount = 0
  connectTickerSocket()

  return () => {
    const entries = subscribers.get(symbol)
    entries?.delete(entry)
    if (entries?.size === 0) subscribers.delete(symbol)
    if (subscriberCount() === 0) {
      intentionalClose = true
      window.clearTimeout(reconnectTimer)
      window.clearTimeout(stabilityTimer)
      reconnectTimer = null
      stabilityTimer = null
      const socket = tickerSocket
      tickerSocket = null
      socket?.close()
      retryCount = 0
    }
  }
}
