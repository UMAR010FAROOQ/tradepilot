import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, where } from 'firebase/firestore'
import { TRADING_FEE_RATE, MIN_TRADE_USD, MAX_DECIMAL_QUANTITY } from '../constants/trading.js'
import { marketBySymbol } from '../data/markets.js'
import { createServiceError } from '../utils/firestoreErrors.js'
import { auth, db } from './firebase.js'
import { positionIdFor } from './positionService.js'

const MONEY_SCALE = 100000000
const roundMoney = (value) => Math.round(value * MONEY_SCALE) / MONEY_SCALE
const roundQuantity = (value) => Number(Number(value).toFixed(MAX_DECIMAL_QUANTITY))

function validateRequest({ userId, symbol, quantity, executionPrice }) {
  if (!auth.currentUser || auth.currentUser.uid !== userId) throw createServiceError('permission-denied', 'Use your authenticated account.')
  const market = marketBySymbol.get(symbol)
  if (!market) throw createServiceError('trading/market-unavailable', 'This market is not supported.')
  const resolvedQuantity = roundQuantity(quantity)
  const resolvedPrice = Number(executionPrice)
  if (!Number.isFinite(resolvedQuantity) || resolvedQuantity <= 0) throw createServiceError('trading/invalid-quantity', 'Enter a quantity greater than zero.')
  if (!Number.isFinite(resolvedPrice) || resolvedPrice <= 0) throw createServiceError('trading/market-unavailable', 'Market price is unavailable.')
  const grossAmount = roundMoney(resolvedQuantity * resolvedPrice)
  if (grossAmount < MIN_TRADE_USD) throw createServiceError('trading/minimum', `Trade value must be at least $${MIN_TRADE_USD}.`)
  return { market, quantity: resolvedQuantity, executionPrice: resolvedPrice, grossAmount }
}

export async function executeBuy(input) {
  const { market, quantity, executionPrice, grossAmount } = validateRequest(input)
  const fee = roundMoney(grossAmount * TRADING_FEE_RATE)
  const netAmount = roundMoney(grossAmount + fee)
  const walletRef = doc(db, 'wallets', input.userId)
  const positionRef = doc(db, 'positions', positionIdFor(input.userId, input.symbol))
  const tradeRef = doc(collection(db, 'trades'))

  await runTransaction(db, async (transaction) => {
    const walletSnapshot = await transaction.get(walletRef)
    const positionSnapshot = await transaction.get(positionRef)
    if (!walletSnapshot.exists()) throw createServiceError('account/wallet-missing', 'Your wallet was not found.')
    const wallet = walletSnapshot.data()
    if (wallet.availableBalance < netAmount) throw createServiceError('trading/insufficient-balance', 'Insufficient balance.')

    const current = positionSnapshot.exists() ? positionSnapshot.data() : null
    const oldQuantity = current?.quantity || 0
    const oldAverage = current?.averageEntryPrice || 0
    const newQuantity = roundQuantity(oldQuantity + quantity)
    const averageEntryPrice = roundMoney(((oldQuantity * oldAverage) + (quantity * executionPrice)) / newQuantity)
    const position = {
      userId: input.userId,
      symbol: input.symbol,
      marketType: market.type,
      quantity: newQuantity,
      averageEntryPrice,
      investedAmount: roundMoney((current?.investedAmount || 0) + grossAmount),
      realizedPnl: current?.realizedPnl || 0,
      status: 'open',
      updatedAt: serverTimestamp(),
      lastTradeId: tradeRef.id,
    }

    transaction.update(walletRef, { availableBalance: roundMoney(wallet.availableBalance - netAmount), updatedAt: serverTimestamp(), lastTradeId: tradeRef.id })
    if (positionSnapshot.exists()) transaction.update(positionRef, position)
    else transaction.set(positionRef, { ...position, createdAt: serverTimestamp() })
    transaction.set(tradeRef, { userId: input.userId, symbol: input.symbol, marketType: market.type, side: 'BUY', quantity, executionPrice, grossAmount, fee, netAmount, realizedPnl: 0, status: 'filled', createdAt: serverTimestamp() })
  })
  return tradeRef.id
}

export async function executeSell(input) {
  const { market, quantity, executionPrice, grossAmount } = validateRequest(input)
  const fee = roundMoney(grossAmount * TRADING_FEE_RATE)
  const netAmount = roundMoney(grossAmount - fee)
  const walletRef = doc(db, 'wallets', input.userId)
  const positionRef = doc(db, 'positions', positionIdFor(input.userId, input.symbol))
  const tradeRef = doc(collection(db, 'trades'))

  await runTransaction(db, async (transaction) => {
    const walletSnapshot = await transaction.get(walletRef)
    const positionSnapshot = await transaction.get(positionRef)
    if (!walletSnapshot.exists()) throw createServiceError('account/wallet-missing', 'Your wallet was not found.')
    if (!positionSnapshot.exists() || positionSnapshot.data().status !== 'open') throw createServiceError('trading/position-missing', 'No open position is available to sell.')
    const wallet = walletSnapshot.data()
    const current = positionSnapshot.data()
    if (quantity > current.quantity) throw createServiceError('trading/quantity-exceeded', 'Sell quantity exceeds your position.')

    const remainingQuantity = roundQuantity(current.quantity - quantity)
    const realizedPnl = roundMoney((executionPrice - current.averageEntryPrice) * quantity - fee)
    transaction.update(walletRef, { availableBalance: roundMoney(wallet.availableBalance + netAmount), updatedAt: serverTimestamp(), lastTradeId: tradeRef.id })
    transaction.update(positionRef, {
      quantity: remainingQuantity,
      averageEntryPrice: remainingQuantity === 0 ? 0 : current.averageEntryPrice,
      investedAmount: remainingQuantity === 0 ? 0 : roundMoney(current.averageEntryPrice * remainingQuantity),
      realizedPnl: roundMoney((current.realizedPnl || 0) + realizedPnl),
      status: remainingQuantity === 0 ? 'closed' : 'open',
      updatedAt: serverTimestamp(),
      lastTradeId: tradeRef.id,
    })
    transaction.set(tradeRef, { userId: input.userId, symbol: input.symbol, marketType: market.type, side: 'SELL', quantity, executionPrice, grossAmount, fee, netAmount, realizedPnl, status: 'filled', createdAt: serverTimestamp() })
  })
  return tradeRef.id
}

export function subscribeToTrades(userId, callback, onError) {
  return onSnapshot(query(collection(db, 'trades'), where('userId', '==', userId), orderBy('createdAt', 'desc')), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), onError)
}

export async function getRecentTrades(userId, count = 10) {
  const snapshot = await getDocs(query(collection(db, 'trades'), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(count)))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}
