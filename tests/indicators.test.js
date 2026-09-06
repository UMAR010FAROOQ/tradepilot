import { describe, expect, it } from 'vitest'
import { atr, rollingPrevious, rsi, sma } from '../src/utils/indicators.js'

const candle = (close, high = close + 1, low = close - 1) => ({ open: close, high, low, close })
describe('indicators', () => {
  it('calculates SMA and leaves insufficient points null', () => expect(sma([1, 2, 3, 4], 3)).toEqual([null, null, 2, 3]))
  it('returns all-null RSI for insufficient data', () => expect(rsi([1, 2, 3], 3)).toEqual([null, null, null]))
  it('returns 100 RSI for an uninterrupted gain', () => expect(rsi([1, 2, 3, 4, 5], 3).at(-1)).toBe(100))
  it('calculates deterministic Wilder RSI', () => expect(rsi([10, 11, 10, 12, 11], 3).at(-1)).toBeCloseTo(54.545454, 5))
  it('excludes current candle from rolling high and low', () => { const candles = [candle(2, 3, 1), candle(4, 5, 2), candle(100, 101, 99)]; expect(rollingPrevious(candles, 2, 2, 'high', 'highest')).toBe(5); expect(rollingPrevious(candles, 2, 2, 'low', 'lowest')).toBe(1) })
  it('returns null ATR when history is insufficient', () => expect(atr([candle(1)], 2)).toBeNull())
  it('calculates true-range ATR', () => expect(atr([candle(10), candle(12, 13, 11), candle(11, 12, 9)], 2)).toBeCloseTo(3))
})
