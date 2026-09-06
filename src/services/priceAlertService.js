import { collection, doc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where } from 'firebase/firestore'
import { marketBySymbol } from '../data/markets.js'
import { createServiceError } from '../utils/firestoreErrors.js'
import { auth, db } from './firebase.js'

const requireOwner = (userId) => { if (!auth.currentUser || auth.currentUser.uid !== userId) throw createServiceError('permission-denied', 'Use your authenticated account.') }

export async function createPriceAlert({ userId, symbol, condition, targetPrice }) {
  requireOwner(userId)
  const market = marketBySymbol.get(symbol)
  const price = Number(targetPrice)
  if (!market) throw createServiceError('trading/market-unavailable', 'This market is not supported.')
  if (!['above', 'below'].includes(condition)) throw createServiceError('alert/invalid-condition', 'Choose Price Above or Price Below.')
  if (!Number.isFinite(price) || price <= 0) throw createServiceError('alert/invalid-price', 'Enter a valid target price.')
  const alertRef = doc(collection(db, 'priceAlerts'))
  await runTransaction(db, async (transaction) => transaction.set(alertRef, { userId, symbol, marketType: market.type, condition, targetPrice: price, status: 'active', createdAt: serverTimestamp(), triggeredAt: null, cancelledAt: null, notificationId: null }))
  return alertRef.id
}

export function subscribeToActivePriceAlerts(userId, callback, onError) {
  return onSnapshot(query(collection(db, 'priceAlerts'), where('userId', '==', userId), where('status', '==', 'active'), orderBy('createdAt', 'desc')), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), onError)
}

export function subscribeToPriceAlerts(userId, callback, onError, count = 50) {
  return onSnapshot(query(collection(db, 'priceAlerts'), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(count)), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), onError)
}

export async function cancelPriceAlert(userId, alertId) {
  requireOwner(userId)
  const alertRef = doc(db, 'priceAlerts', alertId)
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(alertRef)
    if (!snapshot.exists() || snapshot.data().userId !== userId) throw createServiceError('alert/missing', 'This price alert no longer exists.')
    if (snapshot.data().status !== 'active') throw createServiceError('alert/inactive', 'This price alert is no longer active.')
    transaction.update(alertRef, { status: 'cancelled', cancelledAt: serverTimestamp() })
  })
}

export async function triggerPriceAlert({ userId, alert, currentPrice, displaySymbol }) {
  requireOwner(userId)
  const alertRef = doc(db, 'priceAlerts', alert.id)
  const notificationRef = doc(collection(db, 'notifications'))
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(alertRef)
    if (!snapshot.exists() || snapshot.data().userId !== userId || snapshot.data().status !== 'active') throw createServiceError('alert/inactive', 'This price alert is no longer active.')
    const data = snapshot.data()
    const reached = data.condition === 'above' ? currentPrice >= data.targetPrice : currentPrice <= data.targetPrice
    if (!reached) throw createServiceError('alert/not-reached', 'The alert condition is not currently satisfied.')
    transaction.update(alertRef, { status: 'triggered', triggeredAt: serverTimestamp(), notificationId: notificationRef.id })
    transaction.set(notificationRef, { userId, type: 'price_alert', title: 'Price Alert Triggered', message: `${displaySymbol} reached your ${data.condition} ${data.targetPrice} alert.`, read: false, createdAt: serverTimestamp(), referenceType: 'price_alert', referenceId: alert.id })
  })
}
