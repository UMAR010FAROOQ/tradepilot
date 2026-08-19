import { arrayRemove, arrayUnion, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { createServiceError } from '../utils/firestoreErrors.js'

function normalizeSymbol(symbol) {
  return symbol?.trim().toUpperCase()
}

export function subscribeToWatchlist(userId, callback, onError) {
  if (!userId) throw createServiceError('permission-denied', 'A signed-in user is required.')

  return onSnapshot(
    doc(db, 'watchlists', userId),
    (snapshot) => callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null),
    onError,
  )
}

export function addSymbol(userId, symbol) {
  const normalizedSymbol = normalizeSymbol(symbol)
  if (!userId) throw createServiceError('permission-denied', 'A signed-in user is required.')
  if (!normalizedSymbol) throw createServiceError('invalid-argument', 'Enter a market symbol.')

  return updateDoc(doc(db, 'watchlists', userId), {
    symbols: arrayUnion(normalizedSymbol),
    updatedAt: serverTimestamp(),
  })
}

export function removeSymbol(userId, symbol) {
  const normalizedSymbol = normalizeSymbol(symbol)
  if (!userId) throw createServiceError('permission-denied', 'A signed-in user is required.')
  if (!normalizedSymbol) throw createServiceError('invalid-argument', 'Select a market symbol.')

  return updateDoc(doc(db, 'watchlists', userId), {
    symbols: arrayRemove(normalizedSymbol),
    updatedAt: serverTimestamp(),
  })
}
