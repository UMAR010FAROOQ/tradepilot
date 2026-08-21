import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
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
