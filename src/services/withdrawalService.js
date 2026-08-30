import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from './firebase.js'
import { createServiceError } from '../utils/firestoreErrors.js'
import { isBankMethod, paymentMethodByValue } from '../data/paymentMethods.js'

export function createWithdrawalRequest({ userId, amount, method, accountHolderName, destinationAccount, bankName, notes = '' }) {
  const numericAmount = Number(amount)

  if (!userId) throw createServiceError('permission-denied', 'A signed-in user is required.')
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw createServiceError('validation/invalid-amount', 'Withdrawal amount must be greater than zero.')
  }
  const paymentMethod = paymentMethodByValue.get(method)
  if (!paymentMethod) {
    throw createServiceError('validation/missing-method', 'A withdrawal method is required.')
  }
  if (!accountHolderName?.trim()) throw createServiceError('validation/missing-account-name', 'Enter the account holder name.')
  if (!destinationAccount?.trim()) {
    throw createServiceError('validation/missing-destination', 'A destination is required.')
  }
  if (paymentMethod.category === 'Mobile wallet' && !/^03\d{9}$/.test(destinationAccount.replace(/[\s-]/g, ''))) throw createServiceError('validation/invalid-mobile', 'Enter a valid Pakistani mobile number.')
  if (isBankMethod(method) && !bankName?.trim()) throw createServiceError('validation/missing-bank', 'Select a Pakistani bank.')

  const request = {
    userId,
    amount: numericAmount,
    currency: 'USD',
    method,
    paymentCategory: paymentMethod.category,
    accountHolderName: accountHolderName.trim(),
    destinationAccount: destinationAccount.trim(),
    notes: notes.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  if (isBankMethod(method)) request.bankName = bankName.trim()
  return addDoc(collection(db, 'withdrawals'), request)
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
