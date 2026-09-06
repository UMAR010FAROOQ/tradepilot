export function sma(values, period) {
  const output = Array(values.length).fill(null)
  let sum = 0
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index]
    if (index >= period) sum -= values[index - period]
    if (index >= period - 1) output[index] = sum / period
  }
  return output
}

export function rsi(values, period) {
  const output = Array(values.length).fill(null)
  if (values.length <= period) return output
  let gains = 0, losses = 0
  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1]
    gains += Math.max(0, change); losses += Math.max(0, -change)
  }
  let averageGain = gains / period, averageLoss = losses / period
  output[period] = averageLoss === 0 ? 100 : 100 - (100 / (1 + averageGain / averageLoss))
  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1]
    averageGain = (averageGain * (period - 1) + Math.max(0, change)) / period
    averageLoss = (averageLoss * (period - 1) + Math.max(0, -change)) / period
    output[index] = averageLoss === 0 ? 100 : 100 - (100 / (1 + averageGain / averageLoss))
  }
  return output
}

export function rollingPrevious(candles, index, period, field, mode) {
  if (index < period) return null
  const values = candles.slice(index - period, index).map((candle) => candle[field])
  return mode === 'highest' ? Math.max(...values) : Math.min(...values)
}

export function atr(candles, period = 14) {
  if (candles.length < period + 1) return null
  const ranges = candles.slice(-period).map((candle, offset) => {
    const index = candles.length - period + offset
    const previousClose = candles[index - 1]?.close ?? candle.open
    return Math.max(candle.high - candle.low, Math.abs(candle.high - previousClose), Math.abs(candle.low - previousClose))
  })
  return ranges.reduce((sum, value) => sum + value, 0) / ranges.length
}
