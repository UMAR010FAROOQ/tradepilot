import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { createServiceError } from '../utils/firestoreErrors.js'
import { db } from './firebase.js'

function validate(input) {
  const data = { name: input.name.trim(), riskPercent: Number(input.riskPercent), stopLossPercent: input.stopLossPercent === null ? null : Number(input.stopLossPercent), takeProfitRatio: input.takeProfitRatio === null ? null : Number(input.takeProfitRatio), trailingStopPercent: input.trailingStopPercent === null ? null : Number(input.trailingStopPercent) }
  if (!data.name || data.name.length > 80) throw createServiceError('preset/invalid-name', 'Enter a preset name up to 80 characters.')
  if (!Number.isFinite(data.riskPercent) || data.riskPercent <= 0 || data.riskPercent > 10) throw createServiceError('preset/invalid-risk', 'Risk percentage must be greater than 0% and no more than 10%.')
  if (data.stopLossPercent !== null && (!Number.isFinite(data.stopLossPercent) || data.stopLossPercent <= 0 || data.stopLossPercent > 100)) throw createServiceError('preset/invalid-stop', 'Enter a valid stop-loss percentage.')
  if (data.takeProfitRatio !== null && (!Number.isFinite(data.takeProfitRatio) || data.takeProfitRatio <= 0)) throw createServiceError('preset/invalid-ratio', 'Enter a valid take-profit ratio.')
  if (data.trailingStopPercent !== null && (!Number.isFinite(data.trailingStopPercent) || data.trailingStopPercent <= 0 || data.trailingStopPercent > 25)) throw createServiceError('preset/invalid-trailing', 'Trailing percentage must be between 0% and 25%.')
  return data
}

export function subscribeToOrderPresets(userId, callback, onError) { return onSnapshot(query(collection(db, 'orderPresets'), where('userId', '==', userId), orderBy('createdAt', 'desc')), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), onError) }
export function createOrderPreset(userId, input) { const data = validate(input); return addDoc(collection(db, 'orderPresets'), { userId, ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }) }
export function renameOrderPreset(presetId, name) { const clean = name.trim(); if (!clean || clean.length > 80) throw createServiceError('preset/invalid-name', 'Enter a preset name up to 80 characters.'); return updateDoc(doc(db, 'orderPresets', presetId), { name: clean, updatedAt: serverTimestamp() }) }
export function deleteOrderPreset(presetId) { return deleteDoc(doc(db, 'orderPresets', presetId)) }
