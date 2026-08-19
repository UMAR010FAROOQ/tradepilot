import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from './firebase.js'
import { createServiceError } from '../utils/firestoreErrors.js'

function records(snapshot) {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

async function orderedCollection(name) {
  return records(await getDocs(query(collection(db, name), orderBy('createdAt', 'desc'))))
}

export async function getUsers() {
  const [usersSnapshot, walletsSnapshot] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'wallets')),
  ])
  const wallets = new Map(records(walletsSnapshot).map((wallet) => [wallet.userId, wallet]))
  return records(usersSnapshot).map((user) => ({ ...user, wallet: wallets.get(user.uid) || null }))
}

export const getDeposits = () => orderedCollection('deposits')
export async function getWithdrawals() {
  const [withdrawals, walletsSnapshot] = await Promise.all([
    orderedCollection('withdrawals'),
    getDocs(collection(db, 'wallets')),
  ])
  const wallets = new Map(records(walletsSnapshot).map((wallet) => [wallet.userId, wallet]))
  return withdrawals.map((item) => ({
    ...item,
    availableBalance: wallets.get(item.userId)?.availableBalance ?? null,
  }))
}
export const getTransactions = () => orderedCollection('transactions')

export async function getPendingDeposits() {
  return (await getDeposits()).filter((item) => item.status === 'pending')
}

export async function getPendingWithdrawals() {
  return (await getWithdrawals()).filter((item) => item.status === 'pending')
}

function requireAdmin(adminSnapshot) {
  if (!adminSnapshot.exists() || adminSnapshot.data().role !== 'admin') {
    throw createServiceError('admin/unauthorized', 'Administrator access is required.')
  }
}

function requirePending(requestSnapshot) {
  if (!requestSnapshot.exists()) {
    throw createServiceError('admin/request-missing', 'Request not found.')
  }
  if (requestSnapshot.data().status !== 'pending') {
    throw createServiceError('admin/request-processed', 'Request already processed.')
  }
}

async function approveRequest(collectionName, requestId, type) {
  const admin = auth.currentUser
  if (!admin) throw createServiceError('admin/unauthorized', 'Sign in as an administrator.')

  return runTransaction(db, async (transaction) => {
    const requestRef = doc(db, collectionName, requestId)
    const adminRef = doc(db, 'users', admin.uid)
    const requestSnapshot = await transaction.get(requestRef)
    const adminSnapshot = await transaction.get(adminRef)
    requireAdmin(adminSnapshot)
    requirePending(requestSnapshot)

    const requestData = requestSnapshot.data()
    const walletRef = doc(db, 'wallets', requestData.userId)
    const walletSnapshot = await transaction.get(walletRef)
    if (!walletSnapshot.exists()) {
      throw createServiceError('admin/wallet-missing', 'User wallet not found.')
    }

    const wallet = walletSnapshot.data()
    if (type === 'withdrawal' && wallet.availableBalance < requestData.amount) {
      throw createServiceError('admin/insufficient-balance', 'Insufficient wallet balance.')
    }

    const auditRef = doc(collection(db, 'transactions'))
    const walletUpdate = {
      availableBalance:
        type === 'deposit'
          ? wallet.availableBalance + requestData.amount
          : wallet.availableBalance - requestData.amount,
      totalDeposited:
        type === 'deposit' ? wallet.totalDeposited + requestData.amount : wallet.totalDeposited,
      totalWithdrawn:
        type === 'withdrawal' ? wallet.totalWithdrawn + requestData.amount : wallet.totalWithdrawn,
      updatedAt: serverTimestamp(),
      lastTransactionId: auditRef.id,
    }

    transaction.update(walletRef, walletUpdate)
    transaction.update(requestRef, {
      status: 'approved',
      approvedBy: admin.uid,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    transaction.set(auditRef, {
      userId: requestData.userId,
      type,
      amount: requestData.amount,
      currency: requestData.currency,
      status: 'completed',
      referenceId: requestId,
      createdAt: serverTimestamp(),
    })
  })
}

async function rejectRequest(collectionName, requestId, reason) {
  const cleanReason = reason.trim()
  if (!cleanReason) throw createServiceError('validation/missing-reason', 'A reason is required.')
  const admin = auth.currentUser
  if (!admin) throw createServiceError('admin/unauthorized', 'Sign in as an administrator.')

  return runTransaction(db, async (transaction) => {
    const requestRef = doc(db, collectionName, requestId)
    const adminSnapshot = await transaction.get(doc(db, 'users', admin.uid))
    const requestSnapshot = await transaction.get(requestRef)
    requireAdmin(adminSnapshot)
    requirePending(requestSnapshot)

    transaction.update(requestRef, {
      status: 'rejected',
      rejectionReason: cleanReason,
      rejectedBy: admin.uid,
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })
}

export const approveDeposit = (id) => approveRequest('deposits', id, 'deposit')
export const rejectDeposit = (id, reason) => rejectRequest('deposits', id, reason)
export const approveWithdrawal = (id) => approveRequest('withdrawals', id, 'withdrawal')
export const rejectWithdrawal = (id, reason) => rejectRequest('withdrawals', id, reason)
