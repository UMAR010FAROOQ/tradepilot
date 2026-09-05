import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
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
