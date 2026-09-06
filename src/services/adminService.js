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
import { getTicker } from './marketService.js'
import { DEFAULT_RISK_SETTINGS, normalizeRiskSettings, utcDayStart } from './riskService.js'

function records(snapshot) {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

async function orderedCollection(name) {
  return records(await getDocs(query(collection(db, name), orderBy('createdAt', 'desc'))))
}

export async function getUsers() {
  const [usersSnapshot, walletsSnapshot, settingsSnapshot, positionsSnapshot, tradesSnapshot] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'wallets')),
    getDocs(collection(db, 'riskSettings')),
    getDocs(collection(db, 'positions')),
    getDocs(collection(db, 'trades')),
  ])
  const wallets = new Map(records(walletsSnapshot).map((wallet) => [wallet.userId, wallet]))
  const settings = new Map(records(settingsSnapshot).map((item) => [item.userId, item]))
  const positions = records(positionsSnapshot).filter((item) => item.status === 'open' && item.quantity > 0)
  const trades = records(tradesSnapshot)
  const symbols = [...new Set(positions.map((item) => item.symbol))]
  const prices = new Map(await Promise.all(symbols.map(async (symbol) => {
    try { return [symbol, (await getTicker(symbol)).price] } catch { return [symbol, null] }
  })))
  return records(usersSnapshot).map((user) => {
    const userPositions = positions.filter((item) => item.userId === user.uid)
    const exposure = userPositions.reduce((sum, item) => sum + item.quantity * (prices.get(item.symbol) || item.averageEntryPrice), 0)
    const todayRealizedPnl = trades.filter((item) => item.userId === user.uid && item.side === 'SELL' && item.status === 'filled' && item.createdAt?.toDate?.() >= utcDayStart()).reduce((sum, item) => sum + (Number(item.realizedPnl) || 0), 0)
    return { ...user, wallet: wallets.get(user.uid) || null, risk: { ...normalizeRiskSettings(settings.get(user.uid) || DEFAULT_RISK_SETTINGS), openPositions: userPositions.length, exposure, todayRealizedPnl } }
  })
}

export const getDeposits = () => orderedCollection('deposits')
export const getWithdrawals = () => orderedCollection('withdrawals')
export const getTransactions = () => orderedCollection('transactions')
export const getTrades = () => orderedCollection('trades')
export async function getPositions() { return records(await getDocs(collection(db, 'positions'))) }

export async function updateUserRole(userId, nextRole) {
  if (!['user', 'admin'].includes(nextRole)) {
    throw createServiceError('admin/invalid-role', 'Choose either the User or Admin role.')
  }

  const admin = auth.currentUser
  if (!admin) throw createServiceError('admin/unauthorized', 'Sign in as an administrator.')
  if (admin.uid === userId) {
    throw createServiceError('admin/self-role-change', 'You cannot change your own role.')
  }

  return runTransaction(db, async (transaction) => {
    const adminRef = doc(db, 'users', admin.uid)
    const userRef = doc(db, 'users', userId)
    const adminSnapshot = await transaction.get(adminRef)
    const userSnapshot = await transaction.get(userRef)

    requireAdmin(adminSnapshot)
    if (!userSnapshot.exists()) {
      throw createServiceError('admin/user-missing', 'The selected user no longer exists.')
    }

    transaction.update(userRef, {
      role: nextRole,
      updatedAt: serverTimestamp(),
    })
  })
}

export async function getPendingDeposits() {
  return (await getDeposits()).filter((item) => item.status === 'pending')
}

export async function getPendingWithdrawals() {
  return (await getWithdrawals()).filter((item) => item.status === 'pending')
}

function requireAdmin(adminSnapshot) {
  if (!adminSnapshot.exists() || adminSnapshot.data().role !== 'admin' || adminSnapshot.data().accountStatus !== 'active') {
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
    const notificationRef = doc(collection(db, 'notifications'))
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
    transaction.set(notificationRef, {
      userId: requestData.userId,
      type: `${type}_approved`,
      title: `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} approved`,
      message: `Your ${type} request for ${requestData.amount} ${requestData.currency} was approved.`,
      read: false,
      createdAt: serverTimestamp(),
      referenceType: type,
      referenceId: requestId,
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
    const requestData = requestSnapshot.data()
    const type = collectionName === 'deposits' ? 'deposit' : 'withdrawal'
    const notificationRef = doc(collection(db, 'notifications'))

    transaction.update(requestRef, {
      status: 'rejected',
      rejectionReason: cleanReason,
      rejectedBy: admin.uid,
      rejectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    transaction.set(notificationRef, {
      userId: requestData.userId,
      type: `${type}_rejected`,
      title: `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} rejected`,
      message: `Your ${type} request for ${requestData.amount} ${requestData.currency} was rejected.`,
      read: false,
      createdAt: serverTimestamp(),
      referenceType: type,
      referenceId: requestId,
    })
  })
}

export const approveDeposit = (id) => approveRequest('deposits', id, 'deposit')
export const rejectDeposit = (id, reason) => rejectRequest('deposits', id, reason)
export const approveWithdrawal = (id) => approveRequest('withdrawals', id, 'withdrawal')
export const rejectWithdrawal = (id, reason) => rejectRequest('withdrawals', id, reason)
