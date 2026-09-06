import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, where } from 'firebase/firestore'
import { db } from './firebase.js'
import { getCachedHistoricalCandles } from './marketService.js'
import { createServiceError } from '../utils/firestoreErrors.js'

export async function loadBacktestCandles(symbol, interval) {
  const candles = (await getCachedHistoricalCandles(symbol, interval)).slice(-500)
  if (!candles.length) throw createServiceError('backtest/no-history', 'No historical candles are available for this market and interval.')
  return candles
}

export async function saveBacktest(userId, name, market, result) {
  const cleanName = name.trim()
  if (!cleanName || cleanName.length > 80) throw createServiceError('backtest/invalid-name', 'Enter a name between 1 and 80 characters.')
  const { metrics, configuration } = result
  return addDoc(collection(db, 'backtests'), {
    userId, name: cleanName, symbol: configuration.symbol, marketType: market.type, interval: configuration.interval,
    strategy: configuration.strategy, strategyParameters: Object.fromEntries(Object.entries(configuration.strategyParameters).map(([key, value]) => [key, Number(value)])),
    startingBalance: metrics.startingBalance, endingBalance: metrics.endingBalance,
    netProfit: metrics.netProfit, returnPercent: metrics.returnPercent, totalTrades: metrics.totalTrades,
    winRate: metrics.winRate, profitFactor: Number.isFinite(metrics.profitFactor) ? metrics.profitFactor : null,
    maxDrawdown: metrics.maximumDrawdown, totalFees: metrics.totalFees,
    configuration: { startingBalance: Number(configuration.startingBalance), sizingMode: configuration.sizingMode, positionSize: Number(configuration.positionSize), slippage: Number(configuration.slippage || 0), stopLossPercent: configuration.stopLossPercent === '' ? null : Number(configuration.stopLossPercent), takeProfitPercent: configuration.takeProfitPercent === '' ? null : Number(configuration.takeProfitPercent) },
    createdAt: serverTimestamp(),
  })
}

export function subscribeToSavedBacktests(userId, callback, onError) {
  return onSnapshot(query(collection(db, 'backtests'), where('userId', '==', userId), orderBy('createdAt', 'desc')), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), onError)
}

export function deleteSavedBacktest(userId, backtestId) {
  if (!userId || !backtestId) throw createServiceError('backtest/invalid-delete', 'Choose a saved backtest to delete.')
  return deleteDoc(doc(db, 'backtests', backtestId))
}
