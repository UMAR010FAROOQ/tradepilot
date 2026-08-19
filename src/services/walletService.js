import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase.js'
import { createServiceError } from '../utils/firestoreErrors.js'

export async function getWallet(userId) {
  if (!userId) throw createServiceError('account/wallet-missing', 'A user ID is required.')

  const snapshot = await getDoc(doc(db, 'wallets', userId))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export function subscribeToWallet(userId, callback, onError) {
  if (!userId) throw createServiceError('account/wallet-missing', 'A user ID is required.')

  return onSnapshot(
    doc(db, 'wallets', userId),
    (snapshot) => callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null),
    onError,
  )
}
