import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from './firebase.js'
import { createServiceError } from '../utils/firestoreErrors.js'

export function createWithdrawalRequest({ userId, amount, method, destination }) {
  const numericAmount = Number(amount)

  if (!userId) throw createServiceError('permission-denied', 'A signed-in user is required.')
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw createServiceError('validation/invalid-amount', 'Withdrawal amount must be greater than zero.')
  }
  if (!method?.trim()) {
    throw createServiceError('validation/missing-method', 'A withdrawal method is required.')
  }
  if (!destination?.trim()) {
    throw createServiceError('validation/missing-destination', 'A destination is required.')
  }

  return addDoc(collection(db, 'withdrawals'), {
    userId,
    amount: numericAmount,
    currency: 'USD',
    method: method.trim(),
    destination: destination.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function subscribeToWithdrawalRequests(userId, callback, onError) {
  const withdrawalsQuery = query(
    collection(db, 'withdrawals'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  )

  return onSnapshot(
    withdrawalsQuery,
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  )
}
