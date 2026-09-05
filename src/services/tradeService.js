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
  return executeBuyTransaction(input)
}

async function executeBuyTransaction(input, orderId = null) {
  const { market, quantity, executionPrice, grossAmount } = validateRequest(input)
  const fee = roundMoney(grossAmount * TRADING_FEE_RATE)
  const netAmount = roundMoney(grossAmount + fee)
  const walletRef = doc(db, 'wallets', input.userId)
  const positionRef = doc(db, 'positions', positionIdFor(input.userId, input.symbol))
  const tradeRef = doc(collection(db, 'trades'))
  const orderRef = orderId ? doc(db, 'orders', orderId) : null

  await runTransaction(db, async (transaction) => {
    const walletSnapshot = await transaction.get(walletRef)
    const positionSnapshot = await transaction.get(positionRef)
    const orderSnapshot = orderRef ? await transaction.get(orderRef) : null
    if (!walletSnapshot.exists()) throw createServiceError('account/wallet-missing', 'Your wallet was not found.')
    if (orderRef && (!orderSnapshot.exists() || orderSnapshot.data().userId !== input.userId)) throw createServiceError('trading/order-missing', 'This order no longer exists.')
    if (orderSnapshot && orderSnapshot.data().status !== 'pending') throw createServiceError(`trading/order-${orderSnapshot.data().status}`, `This order is already ${orderSnapshot.data().status}.`)
    if (orderSnapshot && (orderSnapshot.data().symbol !== input.symbol || orderSnapshot.data().side !== 'BUY' || orderSnapshot.data().orderType !== 'limit')) throw createServiceError('trading/order-missing', 'This pending order is invalid.')
    if (orderSnapshot && executionPrice > orderSnapshot.data().limitPrice) throw createServiceError('trading/order-condition', 'The limit price condition is not currently satisfied.')
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
      openedAt: current?.status === 'open' ? (current.openedAt ?? null) : serverTimestamp(),
      stopLoss: input.stopLoss ?? current?.stopLoss ?? null,
      takeProfit: input.takeProfit ?? current?.takeProfit ?? null,
      takeProfitTargets: current?.takeProfitTargets || [],
      takeProfitBaseQuantity: current?.takeProfitTargets?.length ? roundQuantity((current.takeProfitBaseQuantity || oldQuantity) + quantity) : null,
      trailingStopEnabled: current?.trailingStopEnabled || false,
      trailingStopPercent: current?.trailingStopPercent || null,
      trailingHighWaterMark: current?.trailingHighWaterMark || null,
      trailingStopPrice: current?.trailingStopPrice || null,
      updatedAt: serverTimestamp(),
      lastTradeId: tradeRef.id,
    }

    transaction.update(walletRef, { availableBalance: roundMoney(wallet.availableBalance - netAmount), updatedAt: serverTimestamp(), lastTradeId: tradeRef.id })
    if (positionSnapshot.exists()) transaction.update(positionRef, position)
    else transaction.set(positionRef, { ...position, createdAt: serverTimestamp() })
    const trade = { userId: input.userId, symbol: input.symbol, marketType: market.type, side: 'BUY', quantity, executionPrice, grossAmount, fee, netAmount, realizedPnl: 0, status: 'filled', createdAt: serverTimestamp() }
    if (orderId) trade.orderId = orderId
    transaction.set(tradeRef, trade)
    if (orderRef) transaction.update(orderRef, { status: 'filled', filledAt: serverTimestamp(), filledPrice: executionPrice, fillTradeId: tradeRef.id, updatedAt: serverTimestamp() })
  })
  return tradeRef.id
}

export async function executePendingLimitBuy({ order, executionPrice }) {
  if (!order?.id) throw createServiceError('trading/order-missing', 'This order no longer exists.')
  return executeBuyTransaction({
    userId: order.userId,
    symbol: order.symbol,
    quantity: order.quantity,
    executionPrice,
    stopLoss: order.stopLoss,
    takeProfit: order.takeProfit,
  }, order.id)
}

export async function executeSell(input) {
  return executeSellTransaction(input)
}

async function executeSellTransaction(input, orderId = null, automation = null) {
  const { market, quantity, executionPrice, grossAmount } = validateRequest(input)
  const fee = roundMoney(grossAmount * TRADING_FEE_RATE)
  const netAmount = roundMoney(grossAmount - fee)
  const walletRef = doc(db, 'wallets', input.userId)
  const positionRef = doc(db, 'positions', positionIdFor(input.userId, input.symbol))
  const tradeRef = doc(collection(db, 'trades'))
  const orderRef = orderId ? doc(db, 'orders', orderId) : null

  await runTransaction(db, async (transaction) => {
    const walletSnapshot = await transaction.get(walletRef)
    const positionSnapshot = await transaction.get(positionRef)
    const orderSnapshot = orderRef ? await transaction.get(orderRef) : null
    if (!walletSnapshot.exists()) throw createServiceError('account/wallet-missing', 'Your wallet was not found.')
    if (!positionSnapshot.exists() || positionSnapshot.data().status !== 'open') throw createServiceError('trading/position-missing', 'No open position is available to sell.')
    const wallet = walletSnapshot.data()
    const current = positionSnapshot.data()
    if (orderRef && (!orderSnapshot.exists() || orderSnapshot.data().userId !== input.userId)) throw createServiceError('trading/order-missing', 'This order no longer exists.')
    if (orderSnapshot && orderSnapshot.data().status !== 'pending') throw createServiceError(`trading/order-${orderSnapshot.data().status}`, `This order is already ${orderSnapshot.data().status}.`)
    if (orderSnapshot && (orderSnapshot.data().side !== 'SELL' || orderSnapshot.data().reduceOnly !== true || executionPrice < orderSnapshot.data().limitPrice)) throw createServiceError('trading/order-condition', 'The reduce-only limit condition is not currently satisfied.')
    if (automation?.type === 'takeProfit' && !current.takeProfitTargets?.some((target) => target.id === automation.targetId && target.status === 'pending')) throw createServiceError('trading/automation-complete', 'This take-profit target is no longer pending.')
    if (quantity > current.quantity) throw createServiceError('trading/quantity-exceeded', 'Sell quantity exceeds your position.')

    const remainingQuantity = roundQuantity(current.quantity - quantity)
    const realizedPnl = roundMoney((executionPrice - current.averageEntryPrice) * quantity - fee)
    transaction.update(walletRef, { availableBalance: roundMoney(wallet.availableBalance + netAmount), updatedAt: serverTimestamp(), lastTradeId: tradeRef.id })
    const takeProfitTargets = automation?.type === 'takeProfit'
      ? current.takeProfitTargets.map((target) => target.id === automation.targetId ? { ...target, status: 'triggered' } : target)
      : (current.takeProfitTargets || [])
    transaction.update(positionRef, {
      quantity: remainingQuantity,
      averageEntryPrice: remainingQuantity === 0 ? 0 : current.averageEntryPrice,
      investedAmount: remainingQuantity === 0 ? 0 : roundMoney(current.averageEntryPrice * remainingQuantity),
      realizedPnl: roundMoney((current.realizedPnl || 0) + realizedPnl),
      status: remainingQuantity === 0 ? 'closed' : 'open',
      stopLoss: remainingQuantity === 0 ? null : (current.stopLoss ?? null),
      takeProfit: remainingQuantity === 0 ? null : (current.takeProfit ?? null),
      takeProfitTargets: remainingQuantity === 0 ? [] : takeProfitTargets,
      takeProfitBaseQuantity: remainingQuantity === 0 ? null : (current.takeProfitBaseQuantity ?? null),
      trailingStopEnabled: remainingQuantity === 0 ? false : (current.trailingStopEnabled || false),
      trailingStopPercent: remainingQuantity === 0 ? null : (current.trailingStopPercent ?? null),
      trailingHighWaterMark: remainingQuantity === 0 ? null : (current.trailingHighWaterMark ?? null),
      trailingStopPrice: remainingQuantity === 0 ? null : (current.trailingStopPrice ?? null),
      updatedAt: serverTimestamp(),
      lastTradeId: tradeRef.id,
    })
    const trade = { userId: input.userId, symbol: input.symbol, marketType: market.type, side: 'SELL', quantity, executionPrice, grossAmount, fee, netAmount, realizedPnl, status: 'filled', createdAt: serverTimestamp() }
    if (orderId) trade.orderId = orderId
    if (automation?.type) trade.closeReason = automation.type
    if (automation?.targetId) trade.automationId = automation.targetId
    transaction.set(tradeRef, trade)
    if (orderRef) transaction.update(orderRef, { status: 'filled', filledAt: serverTimestamp(), filledPrice: executionPrice, fillTradeId: tradeRef.id, updatedAt: serverTimestamp() })
  })
  return tradeRef.id
}

export async function executePendingLimitOrder({ order, executionPrice }) {
  if (!order?.id) throw createServiceError('trading/order-missing', 'This order no longer exists.')
  if (order.side === 'BUY') return executePendingLimitBuy({ order, executionPrice })
  return executeSellTransaction({ userId: order.userId, symbol: order.symbol, quantity: order.quantity, executionPrice }, order.id)
}

export async function executeProtectionClose({ userId, symbol, quantity, executionPrice, reason, targetId }) {
  return executeSellTransaction({ userId, symbol, quantity, executionPrice }, null, { type: reason, targetId })
}

export function subscribeToTrades(userId, callback, onError) {
  return onSnapshot(query(collection(db, 'trades'), where('userId', '==', userId), orderBy('createdAt', 'desc')), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), onError)
}

export function subscribeToSymbolTrades(userId, symbol, callback, onError, count = 20) {
  return onSnapshot(query(collection(db, 'trades'), where('userId', '==', userId), where('symbol', '==', symbol), orderBy('createdAt', 'desc'), limit(count)), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), onError)
}

export async function getRecentTrades(userId, count = 10) {
  const snapshot = await getDocs(query(collection(db, 'trades'), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(count)))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}
