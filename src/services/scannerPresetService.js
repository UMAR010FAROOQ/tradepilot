import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from './firebase.js'
import { createServiceError } from '../utils/firestoreErrors.js'

const modes = ['momentum', 'trend', 'volatility', 'breakout', 'movers', 'watchlist'], types = ['all', 'crypto', 'forex', 'gold'], trends = ['all', 'Bullish', 'Bearish', 'Neutral'], sorts = ['price', 'changePercent', 'momentum', 'volatility', 'breakoutDistance', 'scannerScore']
function normalize(input) {
  const optional = (value) => value === '' || value === null || value === undefined ? null : Number(value)
  const data = { name: input.name.trim(), mode: input.mode, interval: input.interval, marketType: input.marketType, trend: input.trend, minChange: optional(input.minChange), minMomentum: optional(input.minMomentum), minVolatility: optional(input.minVolatility), sortBy: input.sortBy, sortDirection: input.sortDirection }
  if (!data.name || data.name.length > 80) throw createServiceError('scanner/invalid-name', 'Enter a preset name up to 80 characters.')
  if (!modes.includes(data.mode) || !['15m', '1h', '4h', '1d'].includes(data.interval) || !types.includes(data.marketType) || !trends.includes(data.trend) || !sorts.includes(data.sortBy) || !['asc', 'desc'].includes(data.sortDirection)) throw createServiceError('scanner/invalid-preset', 'The scanner preset contains an unsupported option.')
  if (![data.minChange, data.minMomentum].every((value) => value === null || (Number.isFinite(value) && value >= -100 && value <= 100)) || !(data.minVolatility === null || (Number.isFinite(data.minVolatility) && data.minVolatility >= 0 && data.minVolatility <= 100))) throw createServiceError('scanner/invalid-filters', 'Scanner numeric filters are outside the supported range.')
  return data
}
export function subscribeToScannerPresets(userId, callback, onError) { return onSnapshot(query(collection(db, 'scannerPresets'), where('userId', '==', userId), orderBy('createdAt', 'desc')), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), onError) }
export function createScannerPreset(userId, input) { return addDoc(collection(db, 'scannerPresets'), { userId, ...normalize(input), createdAt: serverTimestamp(), updatedAt: serverTimestamp() }) }
export function renameScannerPreset(id, name) { const clean = name.trim(); if (!clean || clean.length > 80) throw createServiceError('scanner/invalid-name', 'Enter a preset name up to 80 characters.'); return updateDoc(doc(db, 'scannerPresets', id), { name: clean, updatedAt: serverTimestamp() }) }
export function deleteScannerPreset(id) { return deleteDoc(doc(db, 'scannerPresets', id)) }
