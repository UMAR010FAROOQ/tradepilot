import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from './firebase.js'
import { createServiceError } from '../utils/firestoreErrors.js'
import { isBankMethod, paymentMethodByValue } from '../data/paymentMethods.js'

export function createDepositRequest({ userId, amount, method, accountHolderName, senderAccount, bankName, reference, notes = '' }) {
  const numericAmount = Number(amount)

  if (!userId) throw createServiceError('permission-denied', 'A signed-in user is required.')
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw createServiceError('validation/invalid-amount', 'Deposit amount must be greater than zero.')
  }
  const paymentMethod = paymentMethodByValue.get(method)
  if (!paymentMethod) {
    throw createServiceError('validation/missing-method', 'A deposit method is required.')
  }
  if (!accountHolderName?.trim()) throw createServiceError('validation/missing-account-name', 'Enter the account holder name.')
  if (!senderAccount?.trim()) throw createServiceError('validation/missing-account', 'Enter the sending account or mobile number.')
  if (paymentMethod.category === 'Mobile wallet' && !/^03\d{9}$/.test(senderAccount.replace(/[\s-]/g, ''))) throw createServiceError('validation/invalid-mobile', 'Enter a valid Pakistani mobile number.')
  if (isBankMethod(method) && !bankName?.trim()) throw createServiceError('validation/missing-bank', 'Select a Pakistani bank.')
  if (!reference?.trim()) {
    throw createServiceError('validation/missing-reference', 'A reference is required.')
  }

  const request = {
    userId,
    amount: numericAmount,
    currency: 'USD',
    method,
    paymentCategory: paymentMethod.category,
    accountHolderName: accountHolderName.trim(),
    senderAccount: senderAccount.trim(),
    reference: reference.trim(),
    notes: notes.trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  if (isBankMethod(method)) request.bankName = bankName.trim()
  return addDoc(collection(db, 'deposits'), request)
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
