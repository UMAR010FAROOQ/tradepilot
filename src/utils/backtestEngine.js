import { TRADING_FEE_RATE } from '../constants/trading.js'
import { rollingPrevious, rsi, sma } from './indicators.js'

export const STRATEGIES = {
  ma: { label: 'Moving Average Crossover', defaults: { fastPeriod: 20, slowPeriod: 50 } },
  rsi: { label: 'RSI Mean Reversion', defaults: { rsiPeriod: 14, oversoldLevel: 30, exitLevel: 55 } },
  breakout: { label: 'Breakout Strategy', defaults: { lookbackPeriod: 20, exitLookback: 10 } },
}

export function validateBacktestConfiguration(config) {
  const capital = Number(config.startingBalance), slippage = Number(config.slippage || 0)
  if (!Number.isFinite(capital) || capital <= 0) return 'Backtest Capital must be a positive number.'
  if (!['percent', 'fixed'].includes(config.sizingMode)) return 'Choose a valid position-sizing mode.'
  const size = Number(config.positionSize)
  if (!Number.isFinite(size) || size <= 0 || (config.sizingMode === 'percent' && size > 100)) return config.sizingMode === 'percent' ? 'Equity percentage must be between 0 and 100.' : 'Fixed USD size must be positive.'
  if (!Number.isFinite(slippage) || slippage < 0 || slippage > 5) return 'Slippage must be between 0% and 5%.'
  for (const field of ['stopLossPercent', 'takeProfitPercent']) if (config[field] !== '' && config[field] !== null && (!Number.isFinite(Number(config[field])) || Number(config[field]) <= 0 || Number(config[field]) > 100)) return `${field === 'stopLossPercent' ? 'Stop Loss' : 'Take Profit'} must be between 0% and 100%.`
  const parameters = config.strategyParameters || {}
  if (config.strategy === 'ma' && (!Number.isInteger(Number(parameters.fastPeriod)) || Number(parameters.fastPeriod) <= 1 || !Number.isInteger(Number(parameters.slowPeriod)) || Number(parameters.slowPeriod) <= Number(parameters.fastPeriod))) return 'Fast MA must be above 1 and Slow MA must be greater than Fast MA.'
  if (config.strategy === 'rsi' && (!Number.isInteger(Number(parameters.rsiPeriod)) || Number(parameters.rsiPeriod) <= 1 || Number(parameters.oversoldLevel) <= 0 || Number(parameters.exitLevel) <= Number(parameters.oversoldLevel) || Number(parameters.exitLevel) > 100)) return 'Use a valid RSI period and an exit level above the oversold level.'
  if (config.strategy === 'breakout' && (![parameters.lookbackPeriod, parameters.exitLookback].every((value) => Number.isInteger(Number(value)) && Number(value) > 1))) return 'Breakout lookbacks must be whole numbers greater than 1.'
  return ''
}

function prepareSignals(candles, strategy, rawParameters) {
  const parameters = Object.fromEntries(Object.entries(rawParameters).map(([key, value]) => [key, Number(value)])), closes = candles.map((candle) => candle.close)
  if (strategy === 'ma') {
    const fast = sma(closes, parameters.fastPeriod), slow = sma(closes, parameters.slowPeriod)
    return candles.map((_, index) => ({ buy: index > 0 && fast[index - 1] <= slow[index - 1] && fast[index] > slow[index], sell: index > 0 && fast[index - 1] >= slow[index - 1] && fast[index] < slow[index], info: { fastMA: fast[index], slowMA: slow[index] } }))
  }
  if (strategy === 'rsi') {
    const values = rsi(closes, parameters.rsiPeriod)
    // Entry requires a completed-close cross from above to at/below oversold; exit occurs at/above the configured level.
    return candles.map((_, index) => ({ buy: index > 0 && values[index - 1] > parameters.oversoldLevel && values[index] <= parameters.oversoldLevel, sell: values[index] !== null && values[index] >= parameters.exitLevel, info: { rsi: values[index] } }))
  }
  return candles.map((_, index) => {
    // The current candle is deliberately excluded from both rolling levels to prevent breakout lookahead.
    const breakoutLevel = rollingPrevious(candles, index, parameters.lookbackPeriod, 'high', 'highest'), exitLevel = rollingPrevious(candles, index, parameters.exitLookback, 'low', 'lowest')
    return { buy: breakoutLevel !== null && candles[index].close > breakoutLevel, sell: exitLevel !== null && candles[index].close < exitLevel, info: { breakoutLevel, exitLevel } }
  })
}

export function runBacktest(candles, configuration) {
  const error = validateBacktestConfiguration(configuration)
  if (error) throw new Error(error)
  if (!Array.isArray(candles) || candles.length < 3) throw new Error('Insufficient historical candles for this backtest.')
  const normalized = candles.slice(0, 500).filter((candle) => ['time', 'open', 'high', 'low', 'close'].every((field) => Number.isFinite(candle[field]))).sort((a, b) => a.time - b.time)
  const signals = prepareSignals(normalized, configuration.strategy, configuration.strategyParameters)
  const feeRate = Number.isFinite(configuration.feeRate) ? configuration.feeRate : TRADING_FEE_RATE, slippage = Number(configuration.slippage || 0) / 100
  const stopPercent = configuration.stopLossPercent === '' || configuration.stopLossPercent === null ? null : Number(configuration.stopLossPercent) / 100
  const takePercent = configuration.takeProfitPercent === '' || configuration.takeProfitPercent === null ? null : Number(configuration.takeProfitPercent) / 100
  let cash = Number(configuration.startingBalance), position = null, pending = null, realizedPnl = 0, totalFees = 0, equityPeak = cash
  const trades = [], equityCurve = [], replayFrames = []

  const closePosition = (basePrice, candle, reason) => {
    const exitPrice = basePrice * (1 - slippage), exitGross = position.quantity * exitPrice, exitFee = exitGross * feeRate
    cash += exitGross - exitFee; totalFees += exitFee
    const netPnl = exitGross - position.entryGross - position.entryFee - exitFee
    realizedPnl += netPnl
    trades.push({ entryTime: position.entryTime, entryPrice: position.entryPrice, entryGross: position.entryGross, entryFee: position.entryFee, quantity: position.quantity, exitTime: candle.time, exitPrice, exitGross, exitFee, netPnl, pnlPercent: position.entryGross ? netPnl / position.entryGross * 100 : 0, exitReason: reason })
    position = null
  }

  normalized.forEach((candle, index) => {
    // A close-based signal from N is only acted on here, at candle N+1 open.
    if (pending === 'BUY' && !position) {
      const entryPrice = candle.open * (1 + slippage), requestedGross = configuration.sizingMode === 'percent' ? cash * Number(configuration.positionSize) / 100 : Number(configuration.positionSize), entryGross = Math.min(requestedGross, cash / (1 + feeRate)), quantity = entryGross / entryPrice, entryFee = entryGross * feeRate
      if (entryGross > 0 && quantity > 0) { cash -= entryGross + entryFee; totalFees += entryFee; position = { entryTime: candle.time, entryPrice, entryGross, entryFee, quantity, stopPrice: stopPercent ? entryPrice * (1 - stopPercent) : null, takePrice: takePercent ? entryPrice * (1 + takePercent) : null } }
      pending = null
    } else if (pending === 'SELL' && position) { closePosition(candle.open, candle, 'Strategy Exit'); pending = null }

    if (position) {
      const stopTouched = position.stopPrice !== null && candle.low <= position.stopPrice, takeTouched = position.takePrice !== null && candle.high >= position.takePrice
      // Intrabar ordering is unknowable at this resolution. Stop Loss wins when both levels are touched.
      if (stopTouched) closePosition(position.stopPrice, candle, 'Stop Loss')
      else if (takeTouched) closePosition(position.takePrice, candle, 'Take Profit')
    }

    const signal = signals[index]
    if (index < normalized.length - 1) {
      if (!position && signal.buy) pending = 'BUY'
      else if (position && signal.sell) pending = 'SELL'
    }
    const equity = cash + (position ? position.quantity * candle.close : 0)
    equityPeak = Math.max(equityPeak, equity)
    const drawdownPercent = equityPeak ? (equity - equityPeak) / equityPeak * 100 : 0
    equityCurve.push({ time: candle.time, value: equity, peak: equityPeak, drawdownPercent })
    replayFrames.push({ index, time: candle.time, cash, position: position ? { ...position } : null, currentValue: position ? position.quantity * candle.close : 0, unrealizedPnl: position ? position.quantity * candle.close - position.entryGross - position.entryFee : 0, realizedPnl, equity, signal: pending === 'BUY' ? 'BUY Signal' : pending === 'SELL' ? 'SELL Signal' : position ? 'Holding' : 'Waiting', info: signal.info, tradeCount: trades.length })
  })

  if (position) {
    const finalCandle = normalized.at(-1); closePosition(finalCandle.close, finalCandle, 'End of Backtest')
    equityPeak = Math.max(equityPeak, cash)
    equityCurve[equityCurve.length - 1] = { ...equityCurve.at(-1), value: cash, peak: equityPeak, drawdownPercent: equityPeak ? (cash - equityPeak) / equityPeak * 100 : 0 }
    replayFrames[replayFrames.length - 1] = { ...replayFrames.at(-1), cash, position: null, currentValue: 0, unrealizedPnl: 0, realizedPnl, equity: cash, signal: 'Waiting', tradeCount: trades.length }
  }
  const wins = trades.filter((trade) => trade.netPnl > 0), losses = trades.filter((trade) => trade.netPnl < 0), grossProfit = wins.reduce((sum, trade) => sum + trade.netPnl, 0), grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.netPnl, 0))
  const maximumDrawdown = Math.abs(Math.min(0, ...equityCurve.map((point) => point.drawdownPercent)))
  return { trades, equityCurve, replayFrames, candles: normalized, configuration: { ...configuration, feeRate }, metrics: { startingBalance: Number(configuration.startingBalance), endingBalance: cash, netProfit: cash - Number(configuration.startingBalance), returnPercent: (cash / Number(configuration.startingBalance) - 1) * 100, totalTrades: trades.length, winningTrades: wins.length, losingTrades: losses.length, winRate: trades.length ? wins.length / trades.length * 100 : 0, averageWin: wins.length ? grossProfit / wins.length : 0, averageLoss: losses.length ? -grossLoss / losses.length : 0, largestWin: wins.length ? Math.max(...wins.map((trade) => trade.netPnl)) : 0, largestLoss: losses.length ? Math.min(...losses.map((trade) => trade.netPnl)) : 0, profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0, totalFees, maximumDrawdown, averageTrade: trades.length ? (cash - Number(configuration.startingBalance)) / trades.length : 0, bestTrade: wins.length ? Math.max(...wins.map((trade) => trade.netPnl)) : 0, worstTrade: losses.length ? Math.min(...losses.map((trade) => trade.netPnl)) : 0, candlesTested: normalized.length } }
}
