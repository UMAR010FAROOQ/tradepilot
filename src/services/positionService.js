import { collection, doc, getDoc, onSnapshot, query, runTransaction, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { TRADING_FEE_RATE } from '../constants/trading.js'
import { db } from './firebase.js'
import { createServiceError } from '../utils/firestoreErrors.js'

export function positionIdFor(userId, symbol) {
  return `${userId}_${symbol}`
}

export async function getPosition(userId, symbol) {
  if (!userId || !symbol) throw createServiceError('trading/position-missing', 'A user and symbol are required.')
  const snapshot = await getDoc(doc(db, 'positions', positionIdFor(userId, symbol)))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export function subscribeToPosition(userId, symbol, callback, onError) {
  if (!userId || !symbol) throw createServiceError('trading/position-missing', 'A user and symbol are required.')
  return onSnapshot(
    doc(db, 'positions', positionIdFor(userId, symbol)),
    (snapshot) => callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null),
    onError,
  )
}

export function subscribeToOpenPositions(userId, callback, onError) {
  if (!userId) throw createServiceError('permission-denied', 'A signed-in user is required.')
  return onSnapshot(
    query(collection(db, 'positions'), where('userId', '==', userId), where('status', '==', 'open')),
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  )
}

export function subscribeToPositions(userId, callback, onError) {
  if (!userId) throw createServiceError('permission-denied', 'A signed-in user is required.')
  return onSnapshot(
    query(collection(db, 'positions'), where('userId', '==', userId)),
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  )
}

export async function updatePositionProtection({ userId, symbol, stopLoss, takeProfit }) {
  if (!userId || !symbol) throw createServiceError('trading/position-missing', 'An open position is required.')
  const positionRef = doc(db, 'positions', positionIdFor(userId, symbol))
  const snapshot = await getDoc(positionRef)
  if (!snapshot.exists() || snapshot.data().userId !== userId || snapshot.data().status !== 'open') {
    throw createServiceError('trading/position-missing', 'The position is no longer open.')
  }
  const position = snapshot.data()
  const resolvedStopLoss = stopLoss === null ? null : Number(stopLoss)
  const resolvedTakeProfit = takeProfit === null ? null : Number(takeProfit)
  if (resolvedStopLoss !== null && (!Number.isFinite(resolvedStopLoss) || resolvedStopLoss <= 0 || resolvedStopLoss >= position.averageEntryPrice)) {
    throw createServiceError('trading/invalid-stop-loss', 'Stop loss must be below the average entry price.')
  }
  if (resolvedTakeProfit !== null && (!Number.isFinite(resolvedTakeProfit) || resolvedTakeProfit <= position.averageEntryPrice)) {
    throw createServiceError('trading/invalid-take-profit', 'Take profit must be above the average entry price.')
  }
  await updateDoc(positionRef, { stopLoss: resolvedStopLoss, takeProfit: resolvedTakeProfit, updatedAt: serverTimestamp() })
}

export async function setBreakEvenStop({ userId, symbol, currentPrice }) {
  const positionRef = doc(db, 'positions', positionIdFor(userId, symbol))
  const snapshot = await getDoc(positionRef)
  if (!snapshot.exists() || snapshot.data().userId !== userId || snapshot.data().status !== 'open') throw createServiceError('trading/position-missing', 'The position is no longer open.')
  const breakEvenPrice = snapshot.data().averageEntryPrice * (1 + TRADING_FEE_RATE) / (1 - TRADING_FEE_RATE)
  if (!Number.isFinite(currentPrice) || currentPrice <= breakEvenPrice) throw createServiceError('trading/break-even-unavailable', 'The current price must be above break even.')
  await updateDoc(positionRef, { stopLoss: breakEvenPrice, updatedAt: serverTimestamp() })
  return breakEvenPrice
}

export async function updateTakeProfitTargets({ userId, symbol, targets }) {
  if (!Array.isArray(targets) || targets.length > 3) throw createServiceError('trading/invalid-targets', 'Add no more than three take-profit targets.')
  const positionRef = doc(db, 'positions', positionIdFor(userId, symbol))
  const snapshot = await getDoc(positionRef)
  if (!snapshot.exists() || snapshot.data().userId !== userId || snapshot.data().status !== 'open') throw createServiceError('trading/position-missing', 'The position is no longer open.')
  const position = snapshot.data()
  const normalized = targets.map((target) => ({ id: String(target.id), price: Number(target.price), closePercent: Number(target.closePercent), status: 'pending' }))
  if (normalized.some((target) => !target.id || !Number.isFinite(target.price) || target.price <= position.averageEntryPrice || !Number.isFinite(target.closePercent) || target.closePercent <= 0 || target.closePercent > 100)) throw createServiceError('trading/invalid-targets', 'Each target needs a valid price above entry and close percentage.')
  if (normalized.some((target, index) => index > 0 && target.price <= normalized[index - 1].price)) throw createServiceError('trading/invalid-targets', 'Take-profit prices must be ascending.')
  if (normalized.reduce((sum, target) => sum + target.closePercent, 0) > 100) throw createServiceError('trading/invalid-targets', 'Take-profit allocations cannot exceed 100%.')
  await updateDoc(positionRef, { takeProfit: null, takeProfitTargets: normalized, takeProfitBaseQuantity: position.quantity, updatedAt: serverTimestamp() })
}

export async function configureTrailingStop({ userId, symbol, percent, currentPrice }) {
  const positionRef = doc(db, 'positions', positionIdFor(userId, symbol))
  const snapshot = await getDoc(positionRef)
  if (!snapshot.exists() || snapshot.data().userId !== userId || snapshot.data().status !== 'open') throw createServiceError('trading/position-missing', 'The position is no longer open.')
  const resolvedPercent = percent === null ? null : Number(percent)
  if (resolvedPercent === null) {
    await updateDoc(positionRef, { trailingStopEnabled: false, trailingStopPercent: null, trailingHighWaterMark: null, trailingStopPrice: null, updatedAt: serverTimestamp() })
    return
  }
  if (!Number.isFinite(resolvedPercent) || resolvedPercent < 0.1 || resolvedPercent > 25) throw createServiceError('trading/invalid-trailing-stop', 'Trailing stop must be between 0.1% and 25%.')
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) throw createServiceError('trading/market-unavailable', 'Market price is unavailable.')
  const highWaterMark = Math.max(currentPrice, snapshot.data().averageEntryPrice)
  await updateDoc(positionRef, { trailingStopEnabled: true, trailingStopPercent: resolvedPercent, trailingHighWaterMark: highWaterMark, trailingStopPrice: highWaterMark * (1 - resolvedPercent / 100), updatedAt: serverTimestamp() })
}

export async function advanceTrailingStop({ userId, symbol, currentPrice }) {
  const positionRef = doc(db, 'positions', positionIdFor(userId, symbol))
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(positionRef)
    if (!snapshot.exists() || snapshot.data().userId !== userId || snapshot.data().status !== 'open' || !snapshot.data().trailingStopEnabled) return false
    const position = snapshot.data()
    const previousHigh = position.trailingHighWaterMark || position.averageEntryPrice
    if (!Number.isFinite(currentPrice) || currentPrice < previousHigh * 1.001) return false
    transaction.update(positionRef, { trailingHighWaterMark: currentPrice, trailingStopPrice: currentPrice * (1 - position.trailingStopPercent / 100), updatedAt: serverTimestamp() })
    return true
  })
}
