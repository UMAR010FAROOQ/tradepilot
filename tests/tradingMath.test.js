import { describe, expect, it } from 'vitest'
import { TRADING_FEE_RATE } from '../src/constants/trading.js'
import { calculateBreakEvenPrice, calculateBuyQuote, calculatePositionSize, calculateRealizedPnl, calculateRiskReward, calculateSellQuote, weightedAverageEntry } from '../src/utils/tradingMath.js'

describe('trading math', () => {
  it('calculates buy gross, fee, and total cost', () => { const quote = calculateBuyQuote(2, 100); expect(quote.grossAmount).toBe(200); expect(quote.fee).toBeCloseTo(200 * TRADING_FEE_RATE); expect(quote.totalCost).toBeCloseTo(200 * (1 + TRADING_FEE_RATE)) })
  it('calculates sell gross, fee, and proceeds', () => { const quote = calculateSellQuote(2, 125); expect(quote.grossAmount).toBe(250); expect(quote.fee).toBeCloseTo(250 * TRADING_FEE_RATE); expect(quote.netProceeds).toBeCloseTo(250 * (1 - TRADING_FEE_RATE)) })
  it('calculates realized P/L for a partial close', () => expect(calculateRealizedPnl(2, 100, 110, 0.22)).toBeCloseTo(19.78))
  it('calculates weighted average entry', () => expect(weightedAverageEntry(2, 100, 1, 130)).toBeCloseTo(110))
  it('returns zero weighted entry for an empty position', () => expect(weightedAverageEntry(0, 0, 0, 0)).toBe(0))
  it('calculates fee-aware break even', () => expect(calculateBreakEvenPrice(100)).toBeCloseTo(100 * (1 + TRADING_FEE_RATE) / (1 - TRADING_FEE_RATE)))
  it('calculates risk/reward', () => expect(calculateRiskReward({ quantity: 2, entryPrice: 100, stopLoss: 95, takeProfit: 115 })).toEqual({ risk: 10, reward: 30, ratio: 3 }))
  it('calculates risk-based position size', () => expect(calculatePositionSize(100, 50, 45)).toBe(20))
})
