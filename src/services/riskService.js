import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore'
import { getTicker } from './marketService.js'
import { db } from './firebase.js'
import { createServiceError } from '../utils/firestoreErrors.js'
import { TRADING_FEE_RATE } from '../constants/trading.js'

export const DEFAULT_RISK_SETTINGS = { maxTradeRiskPercent: 5, maxPositionPercent: 50, dailyLossLimitPercent: 10, maxOpenPositions: 5, riskProtectionEnabled: true }
export const utcDayStart = (date = new Date()) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

export function normalizeRiskSettings(data = {}) { return { ...DEFAULT_RISK_SETTINGS, ...data } }
export function subscribeToRiskSettings(userId, callback, onError) { return onSnapshot(doc(db, 'riskSettings', userId), (snapshot) => callback(snapshot.exists() ? normalizeRiskSettings(snapshot.data()) : { userId, ...DEFAULT_RISK_SETTINGS }), onError) }

export async function saveRiskSettings(userId, input) {
  const values = { maxTradeRiskPercent: Number(input.maxTradeRiskPercent), maxPositionPercent: Number(input.maxPositionPercent), dailyLossLimitPercent: Number(input.dailyLossLimitPercent), maxOpenPositions: Number(input.maxOpenPositions), riskProtectionEnabled: Boolean(input.riskProtectionEnabled) }
  if (!Number.isFinite(values.maxTradeRiskPercent) || values.maxTradeRiskPercent < 0.1 || values.maxTradeRiskPercent > 20) throw createServiceError('risk/invalid-settings', 'Maximum trade risk must be between 0.1% and 20%.')
  if (!Number.isFinite(values.maxPositionPercent) || values.maxPositionPercent < 1 || values.maxPositionPercent > 100) throw createServiceError('risk/invalid-settings', 'Maximum position size must be between 1% and 100%.')
  if (!Number.isFinite(values.dailyLossLimitPercent) || values.dailyLossLimitPercent < 1 || values.dailyLossLimitPercent > 50) throw createServiceError('risk/invalid-settings', 'Daily loss limit must be between 1% and 50%.')
  if (!Number.isInteger(values.maxOpenPositions) || values.maxOpenPositions < 1 || values.maxOpenPositions > 20) throw createServiceError('risk/invalid-settings', 'Maximum open positions must be between 1 and 20.')
  const ref = doc(db, 'riskSettings', userId), existing = await getDoc(ref)
  await setDoc(ref, { userId, ...values, createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(), updatedAt: serverTimestamp() })
}

export function evaluateTradeRisk({ symbol, side = 'BUY', quantity, entryPrice, stopLoss, wallet, positions, trades, settings, prices = new Map() }) {
  const resolved = normalizeRiskSettings(settings), open = positions.filter((item) => item.status === 'open' && item.quantity > 0)
  const exposure = open.reduce((sum, item) => sum + item.quantity * (prices.get(item.symbol) || item.averageEntryPrice), 0)
  const accountEquity = (wallet?.availableBalance || 0) + exposure
  const dailyRealizedPnl = trades.filter((item) => item.side === 'SELL' && item.status === 'filled' && item.createdAt?.toDate?.() >= utcDayStart()).reduce((sum, item) => sum + (Number(item.realizedPnl) || 0), 0)
  const dailyLossUsed = Math.max(0, -dailyRealizedPnl), dailyLossLimitAmount = accountEquity * resolved.dailyLossLimitPercent / 100
  const existing = open.find((item) => item.symbol === symbol), resolvedQuantity = Number(quantity), resolvedEntry = Number(entryPrice), resolvedStop = stopLoss === null || stopLoss === '' || stopLoss === undefined ? null : Number(stopLoss), resultingValue = ((existing?.quantity || 0) + (resolvedQuantity || 0)) * (resolvedEntry || 0)
  const positionPercent = accountEquity > 0 ? resultingValue / accountEquity * 100 : 0
  const feeRisk = Number.isFinite(resolvedStop) ? resolvedQuantity * (resolvedEntry + resolvedStop) * TRADING_FEE_RATE : 0
  const tradeRiskAmount = Number.isFinite(resolvedStop) && resolvedStop < resolvedEntry ? (resolvedEntry - resolvedStop) * resolvedQuantity + feeRisk : null
  const tradeRiskPercent = tradeRiskAmount !== null && accountEquity > 0 ? tradeRiskAmount / accountEquity * 100 : null
  const violations = [], warnings = []
  if (side === 'BUY' && resolved.riskProtectionEnabled) {
    if (dailyLossLimitAmount > 0 && dailyLossUsed >= dailyLossLimitAmount) violations.push('Daily loss limit reached.')
    if (!existing && open.length >= resolved.maxOpenPositions) violations.push(`Maximum ${resolved.maxOpenPositions} open positions reached.`)
    if (positionPercent > resolved.maxPositionPercent) violations.push(`${symbol} position would exceed your ${resolved.maxPositionPercent}% position limit.`)
    if (tradeRiskPercent !== null && tradeRiskPercent > resolved.maxTradeRiskPercent) violations.push(`Estimated trade risk is ${tradeRiskPercent.toFixed(1)}%, above your ${resolved.maxTradeRiskPercent}% limit.`)
    if (tradeRiskPercent === null) warnings.push('Trade risk cannot be calculated without a Stop Loss.')
    if (positionPercent >= resolved.maxPositionPercent * 0.8) warnings.push('Position size is nearing its configured limit.')
    if (dailyLossLimitAmount > 0 && dailyLossUsed >= dailyLossLimitAmount * 0.8) warnings.push('Daily loss usage is nearing its configured limit.')
    if (!existing && open.length >= resolved.maxOpenPositions - 1) warnings.push('Open position count is nearing its configured limit.')
  }
  return { allowed: violations.length === 0, violations, warnings, metrics: { accountEquity, tradeRiskAmount, tradeRiskPercent, positionPercent, dailyRealizedPnl, dailyLossUsed, dailyLossLimitAmount, openPositionCount: open.length, totalExposure: exposure } }
}

export async function getTradeRiskContext({ userId, symbol, side = 'BUY', quantity, entryPrice, stopLoss }) {
  const start = Timestamp.fromDate(utcDayStart())
  const [walletSnapshot, settingsSnapshot, positionsSnapshot, tradesSnapshot] = await Promise.all([
    getDoc(doc(db, 'wallets', userId)), getDoc(doc(db, 'riskSettings', userId)),
    getDocs(query(collection(db, 'positions'), where('userId', '==', userId), where('status', '==', 'open'))),
    getDocs(query(collection(db, 'trades'), where('userId', '==', userId), where('createdAt', '>=', start), orderBy('createdAt', 'desc'))),
  ])
  const positions = positionsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
  const prices = new Map((await Promise.all(positions.map(async (position) => { try { return [position.symbol, (await getTicker(position.symbol)).price] } catch { return [position.symbol, position.averageEntryPrice] } }))))
  return evaluateTradeRisk({ symbol, side, quantity, entryPrice, stopLoss, wallet: walletSnapshot.data(), positions, trades: tradesSnapshot.docs.map((item) => item.data()), settings: settingsSnapshot.data(), prices })
}

export async function enforceBuyRisk(input) { const result = await getTradeRiskContext({ ...input, side: 'BUY' }); if (!result.allowed) throw createServiceError('risk/blocked', result.violations[0]); return result }
