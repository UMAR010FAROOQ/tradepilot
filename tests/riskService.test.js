import { describe, expect, it } from 'vitest'
import { evaluateTradeRisk } from '../src/services/riskService.js'

const base = { symbol: 'BTCUSDT', side: 'BUY', quantity: 1, entryPrice: 100, stopLoss: 95, wallet: { availableBalance: 10000 }, positions: [], trades: [], settings: { maxTradeRiskPercent: 5, maxPositionPercent: 50, dailyLossLimitPercent: 10, maxOpenPositions: 2, riskProtectionEnabled: true } }
const open = (symbol, quantity = 10, averageEntryPrice = 100) => ({ symbol, quantity, averageEntryPrice, status: 'open' })
const today = (pnl) => ({ side: 'SELL', status: 'filled', realizedPnl: pnl, createdAt: { toDate: () => new Date() } })
describe('risk management', () => {
  it('allows a trade below configured limits', () => expect(evaluateTradeRisk(base).allowed).toBe(true))
  it('blocks a trade above max risk', () => expect(evaluateTradeRisk({ ...base, quantity: 60, stopLoss: 90 }).violations.some((item) => item.includes('trade risk'))).toBe(true))
  it('blocks a combined position above max position size', () => expect(evaluateTradeRisk({ ...base, quantity: 20, positions: [open('BTCUSDT', 40)], settings: { ...base.settings, maxPositionPercent: 40 } }).violations.some((item) => item.includes('position'))).toBe(true))
  it('blocks a new symbol at max open positions', () => expect(evaluateTradeRisk({ ...base, positions: [open('ETHUSDT'), open('BNBUSDT')] }).violations.some((item) => item.includes('Maximum'))).toBe(true))
  it('allows adding to an existing symbol at max count when other limits pass', () => expect(evaluateTradeRisk({ ...base, quantity: 1, positions: [open('BTCUSDT', 1), open('ETHUSDT', 1)] }).violations.some((item) => item.includes('Maximum'))).toBe(false))
  it('allows when daily loss is below threshold', () => expect(evaluateTradeRisk({ ...base, trades: [today(-900)] }).violations.some((item) => item.includes('Daily'))).toBe(false))
  it('blocks when daily loss limit is reached', () => expect(evaluateTradeRisk({ ...base, trades: [today(-1000)] }).violations.some((item) => item.includes('Daily loss limit'))).toBe(true))
  it('never blocks a risk-reducing SELL', () => expect(evaluateTradeRisk({ ...base, side: 'SELL', quantity: 100000, trades: [today(-5000)] }).allowed).toBe(true))
  it('warns when BUY has no stop loss', () => expect(evaluateTradeRisk({ ...base, stopLoss: null }).warnings.some((item) => item.includes('without a Stop Loss'))).toBe(true))
  it('revalidates pending BUY inputs against current positions', () => expect(evaluateTradeRisk({ ...base, positions: [open('BTCUSDT', 49)], quantity: 2, settings: { ...base.settings, maxPositionPercent: 30 } }).allowed).toBe(false))
})
