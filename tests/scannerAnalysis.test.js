import { describe, expect, it } from 'vitest'
import { analyzeScannerCandles, buildScannerRow } from '../src/utils/scannerAnalysis.js'

const candles = (mapper) => Array.from({ length: 60 }, (_, index) => { const close = mapper(index); return { time: index, open: close, high: close + 1, low: close - 1, close } })
describe('scanner analysis', () => {
  it('classifies bullish and bearish SMA trends', () => { expect(analyzeScannerCandles(candles((i) => 100 + i), { price: 160 }).trend).toBe('Bullish'); expect(analyzeScannerCandles(candles((i) => 200 - i), { price: 140 }).trend).toBe('Bearish') })
  it('classifies a flat series as neutral', () => expect(analyzeScannerCandles(candles(() => 100), { price: 100 }).trend).toBe('Neutral'))
  it('reports breakout, near breakout, and inside range', () => { const base = candles(() => 100); expect(analyzeScannerCandles(base, { price: 102.1 }).breakoutStatus).toBe('Breakout'); expect(analyzeScannerCandles(base, { price: 100.5 }).breakoutStatus).toBe('Near Breakout'); expect(analyzeScannerCandles(base, { price: 90 }).breakoutStatus).toBe('Inside Range') })
  it('excludes the current candle from breakout lookback', () => { const data = candles(() => 100); data.at(-1).high = 1000; expect(analyzeScannerCandles(data, { price: 102 }).breakoutLevel).toBe(101) })
  it('preserves unavailable market performance as null', () => { const row = buildScannerRow({ symbol: 'BTCUSDT' }, null, null, 'error'); expect(row.changePercent).toBeNull(); expect(row.momentum).toBeNull(); expect(row.scannerScore).toBeNull() })
  it('combines ticker and recent momentum deterministically', () => expect(buildScannerRow({ symbol: 'BTCUSDT' }, { price: 100, changePercent: 2 }, { trend: 'Bullish', recentReturn: 3, atr: 1, breakoutLevel: 99 }, 'ready').momentum).toBe(5))
  it('rejects insufficient data', () => expect(() => analyzeScannerCandles([], null)).toThrow('Insufficient'))
})
