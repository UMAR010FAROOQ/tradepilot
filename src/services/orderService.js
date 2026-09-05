import { collection, doc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where } from 'firebase/firestore'
import { MAX_DECIMAL_QUANTITY } from '../constants/trading.js'
import { marketBySymbol } from '../data/markets.js'
import { createServiceError } from '../utils/firestoreErrors.js'
import { auth, db } from './firebase.js'

function requireOwner(userId) {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw createServiceError('permission-denied', 'Use your authenticated account.')
  }
}

export async function createLimitOrder({ userId, symbol, side = 'BUY', quantity, limitPrice, stopLoss, takeProfit }) {
  requireOwner(userId)
  const market = marketBySymbol.get(symbol)
  const resolvedQuantity = Number(Number(quantity).toFixed(MAX_DECIMAL_QUANTITY))
  const resolvedLimit = Number(limitPrice)
  if (!market) throw createServiceError('trading/market-unavailable', 'This market is not supported.')
  if (!Number.isFinite(resolvedQuantity) || resolvedQuantity <= 0) throw createServiceError('trading/invalid-quantity', 'Enter a valid quantity greater than zero.')
  if (!Number.isFinite(resolvedLimit) || resolvedLimit <= 0) throw createServiceError('trading/invalid-limit-price', 'Enter a valid limit price.')
  const resolvedStop = stopLoss === null ? null : Number(stopLoss)
  const resolvedTake = takeProfit === null ? null : Number(takeProfit)
  const reduceOnly = side === 'SELL'
  if (!['BUY', 'SELL'].includes(side)) throw createServiceError('trading/order-missing', 'Choose a valid order side.')
  if (resolvedStop !== null && (!Number.isFinite(resolvedStop) || resolvedStop <= 0 || resolvedStop >= resolvedLimit)) throw createServiceError('trading/invalid-stop-loss', 'Stop loss must be below the limit price.')
  if (resolvedTake !== null && (!Number.isFinite(resolvedTake) || resolvedTake <= resolvedLimit)) throw createServiceError('trading/invalid-take-profit', 'Take profit must be above the limit price.')

  const orderRef = doc(collection(db, 'orders'))
  const positionRef = doc(db, 'positions', `${userId}_${symbol}`)
  await runTransaction(db, async (transaction) => {
    if (reduceOnly) {
      const positionSnapshot = await transaction.get(positionRef)
      if (!positionSnapshot.exists() || positionSnapshot.data().status !== 'open') throw createServiceError('trading/position-missing', 'An open position is required for a reduce-only sell.')
      if (resolvedQuantity > positionSnapshot.data().quantity) throw createServiceError('trading/quantity-exceeded', 'Sell quantity exceeds your position.')
    }
    transaction.set(orderRef, {
      userId, symbol, marketType: market.type, side, orderType: 'limit', reduceOnly,
      quantity: resolvedQuantity, limitPrice: resolvedLimit, stopLoss: reduceOnly ? null : resolvedStop,
      takeProfit: reduceOnly ? null : resolvedTake, status: 'pending', createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(), filledAt: null, filledPrice: null,
      fillTradeId: null, cancelledAt: null,
    })
  })
  return orderRef
}

export function subscribeToPendingOrders(userId, symbol, callback, onError) {
  return onSnapshot(
    query(collection(db, 'orders'), where('userId', '==', userId), where('symbol', '==', symbol), where('status', '==', 'pending'), orderBy('createdAt', 'desc')),
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  )
}

export function subscribeToAllPendingOrders(userId, callback, onError) {
  return onSnapshot(
    query(collection(db, 'orders'), where('userId', '==', userId), where('status', '==', 'pending'), orderBy('createdAt', 'desc')),
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  )
}

export function subscribeToSymbolOrders(userId, symbol, callback, onError, count = 25) {
  return onSnapshot(
    query(collection(db, 'orders'), where('userId', '==', userId), where('symbol', '==', symbol), orderBy('createdAt', 'desc'), limit(count)),
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  )
}

export async function editPendingOrder({ userId, orderId, quantity, limitPrice, stopLoss, takeProfit }) {
  requireOwner(userId)
  const orderRef = doc(db, 'orders', orderId)
  const resolvedQuantity = Number(Number(quantity).toFixed(MAX_DECIMAL_QUANTITY))
  const resolvedLimit = Number(limitPrice)
  if (!Number.isFinite(resolvedQuantity) || resolvedQuantity <= 0) throw createServiceError('trading/invalid-quantity', 'Enter a valid quantity greater than zero.')
  if (!Number.isFinite(resolvedLimit) || resolvedLimit <= 0) throw createServiceError('trading/invalid-limit-price', 'Enter a valid limit price.')
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(orderRef)
    if (!snapshot.exists() || snapshot.data().userId !== userId) throw createServiceError('trading/order-missing', 'This order no longer exists.')
    const order = snapshot.data()
    if (order.status !== 'pending') throw createServiceError(`trading/order-${order.status}`, `This order is already ${order.status}.`)
    if (order.side === 'SELL') {
      const positionSnapshot = await transaction.get(doc(db, 'positions', `${userId}_${order.symbol}`))
      if (!positionSnapshot.exists() || positionSnapshot.data().status !== 'open') throw createServiceError('trading/position-missing', 'The position is no longer open.')
      if (resolvedQuantity > positionSnapshot.data().quantity) throw createServiceError('trading/quantity-exceeded', 'Sell quantity exceeds your position.')
    }
    const resolvedStop = order.side === 'BUY' && stopLoss !== '' && stopLoss !== null ? Number(stopLoss) : null
    const resolvedTake = order.side === 'BUY' && takeProfit !== '' && takeProfit !== null ? Number(takeProfit) : null
    if (resolvedStop !== null && (!Number.isFinite(resolvedStop) || resolvedStop <= 0 || resolvedStop >= resolvedLimit)) throw createServiceError('trading/invalid-stop-loss', 'Stop loss must be below the limit price.')
    if (resolvedTake !== null && (!Number.isFinite(resolvedTake) || resolvedTake <= resolvedLimit)) throw createServiceError('trading/invalid-take-profit', 'Take profit must be above the limit price.')
    transaction.update(orderRef, { quantity: resolvedQuantity, limitPrice: resolvedLimit, stopLoss: resolvedStop, takeProfit: resolvedTake, updatedAt: serverTimestamp() })
  })
}

export async function cancelPendingOrder(userId, orderId) {
  requireOwner(userId)
  const orderRef = doc(db, 'orders', orderId)
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(orderRef)
    if (!snapshot.exists() || snapshot.data().userId !== userId) throw createServiceError('trading/order-missing', 'This order no longer exists.')
    if (snapshot.data().status !== 'pending') throw createServiceError(`trading/order-${snapshot.data().status}`, `This order is already ${snapshot.data().status}.`)
    transaction.update(orderRef, { status: 'cancelled', cancelledAt: serverTimestamp(), updatedAt: serverTimestamp() })
  })
}
