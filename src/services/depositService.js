import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from './firebase.js'
import { createServiceError } from '../utils/firestoreErrors.js'

export function createDepositRequest({ userId, amount, method, reference }) {
  const numericAmount = Number(amount)

  if (!userId) throw createServiceError('permission-denied', 'A signed-in user is required.')
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw createServiceError('validation/invalid-amount', 'Deposit amount must be greater than zero.')
  }
  if (!method?.trim()) {
    throw createServiceError('validation/missing-method', 'A deposit method is required.')
  }
  if (!reference?.trim()) {
    throw createServiceError('validation/missing-reference', 'A reference is required.')
  }

  return addDoc(collection(db, 'deposits'), {
    userId,
    amount: numericAmount,
    currency: 'USD',
    method: method.trim(),
    reference: reference.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function subscribeToDepositRequests(userId, callback, onError) {
  const depositsQuery = query(
    collection(db, 'deposits'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  )

  return onSnapshot(
    depositsQuery,
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  )
}
