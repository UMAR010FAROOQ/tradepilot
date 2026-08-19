import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { createServiceError } from '../utils/firestoreErrors.js'

const initializationRequests = new Map()

async function createWalletIfMissing(userId) {
  const walletRef = doc(db, 'wallets', userId)
  const walletSnapshot = await getDoc(walletRef)

  if (walletSnapshot.exists()) return false

  await setDoc(walletRef, {
    userId,
    currency: 'USD',
    availableBalance: 0,
    lockedBalance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return true
}

async function createWatchlistIfMissing(userId) {
  const watchlistRef = doc(db, 'watchlists', userId)
  const watchlistSnapshot = await getDoc(watchlistRef)

  if (watchlistSnapshot.exists()) return false

  await setDoc(watchlistRef, {
    userId,
    symbols: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return true
}

async function performInitialization(userId) {
  try {
    const [walletCreated, watchlistCreated] = await Promise.all([
      createWalletIfMissing(userId),
      createWatchlistIfMissing(userId),
    ])

    return { walletCreated, watchlistCreated }
  } catch (error) {
    if (error?.code?.startsWith('account/')) throw error

    const initializationError = createServiceError(
      'account/initialization-failed',
      'Account initialization did not complete.',
    )
    initializationError.cause = error
    throw initializationError
  }
}

export function initializeUserAccount(user) {
  if (!user?.uid) {
    throw createServiceError('account/initialization-failed', 'A signed-in user is required.')
  }

  if (!initializationRequests.has(user.uid)) {
    const request = performInitialization(user.uid).finally(() => {
      initializationRequests.delete(user.uid)
    })
    initializationRequests.set(user.uid, request)
  }

  return initializationRequests.get(user.uid)
}
