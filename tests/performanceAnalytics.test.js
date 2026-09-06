import { describe, expect, it } from 'vitest'
import { aggregatePerformance, currentUtcPeriods } from '../src/utils/performanceAnalytics.js'

const stamp = (iso) => { const value = new Date(iso); return { toDate: () => value, toMillis: () => value.getTime() } }
const sell = (pnl, iso, fee = 1) => ({ side: 'SELL', status: 'filled', realizedPnl: pnl, fee, grossAmount: 100, createdAt: stamp(iso) })
describe('performance analytics', () => {
  const trades = [sell(20, '2026-01-01T10:00:00Z'), sell(-10, '2026-01-01T12:00:00Z'), sell(30, '2026-01-02T10:00:00Z'), sell(-5, '2026-01-03T10:00:00Z'), { side: 'BUY', fee: 2, grossAmount: 50, createdAt: stamp('2026-01-03T09:00:00Z') }]
  it('aggregates realized P/L, fees, counts, and win rate', () => { const result = aggregatePerformance(trades); expect(result.realizedPnl).toBe(35); expect(result.fees).toBe(6); expect(result.sells).toHaveLength(4); expect(result.winRate).toBe(50) })
  it('calculates average/best/worst trades and profit factor', () => { const result = aggregatePerformance(trades); expect(result.averageWin).toBe(25); expect(result.averageLoss).toBe(-7.5); expect(result.largestWin).toBe(30); expect(result.largestLoss).toBe(-10); expect(result.profitFactor).toBeCloseTo(50 / 15) })
  it('groups daily and identifies best/worst days', () => { const result = aggregatePerformance(trades); expect(result.days).toHaveLength(3); expect(result.bestDay.pnl).toBe(30); expect(result.worstDay.pnl).toBe(-5) })
  it('tracks streaks and maximum realized drawdown', () => { const result = aggregatePerformance(trades); expect(result.longestWinStreak).toBe(1); expect(result.longestLossStreak).toBe(1); expect(result.maximumDrawdown).toBe(10) })
  it('groups current day, week, and month deterministically', () => { const result = currentUtcPeriods(trades, new Date('2026-01-03T15:00:00Z')); expect(result.today.tradeCount).toBe(2); expect(result.week.realizedPnl).toBe(35); expect(result.month.fees).toBe(6) })
})
