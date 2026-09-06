import { TRADING_FEE_RATE } from '../constants/trading.js'

export const roundFinancial = (value) => Math.round(value * 100000000) / 100000000
export function calculateBuyQuote(quantity, price, feeRate = TRADING_FEE_RATE) { const grossAmount = roundFinancial(quantity * price), fee = roundFinancial(grossAmount * feeRate); return { grossAmount, fee, totalCost: roundFinancial(grossAmount + fee) } }
export function calculateSellQuote(quantity, price, feeRate = TRADING_FEE_RATE) { const grossAmount = roundFinancial(quantity * price), fee = roundFinancial(grossAmount * feeRate); return { grossAmount, fee, netProceeds: roundFinancial(grossAmount - fee) } }
export const calculateRealizedPnl = (quantity, entryPrice, exitPrice, exitFee = 0) => roundFinancial((exitPrice - entryPrice) * quantity - exitFee)
export function weightedAverageEntry(existingQuantity, existingAverage, addedQuantity, addedPrice) { const totalQuantity = existingQuantity + addedQuantity; return totalQuantity > 0 ? roundFinancial(((existingQuantity * existingAverage) + (addedQuantity * addedPrice)) / totalQuantity) : 0 }
export const calculateBreakEvenPrice = (entryPrice, feeRate = TRADING_FEE_RATE) => entryPrice * (1 + feeRate) / (1 - feeRate)
export function calculateRiskReward({ quantity, entryPrice, stopLoss, takeProfit }) { const risk = Math.max(0, entryPrice - stopLoss) * quantity, reward = Math.max(0, takeProfit - entryPrice) * quantity; return { risk, reward, ratio: risk > 0 ? reward / risk : null } }
export const calculatePositionSize = (riskAmount, entryPrice, stopLoss) => entryPrice > stopLoss ? riskAmount / (entryPrice - stopLoss) : 0
