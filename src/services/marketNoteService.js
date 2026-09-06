import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { createServiceError } from '../utils/firestoreErrors.js'
import { db } from './firebase.js'

export async function getMarketNote(userId, symbol) {
  const snapshot = await getDoc(doc(db, 'marketNotes', `${userId}_${symbol}`))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export async function saveMarketNote(userId, symbol, notes) {
  if (notes.length > 5000) throw createServiceError('notes/too-long', 'Market notes cannot exceed 5,000 characters.')
  const noteRef = doc(db, 'marketNotes', `${userId}_${symbol}`)
  const existing = await getDoc(noteRef)
  await setDoc(noteRef, { userId, symbol, notes: notes.trim(), createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(), updatedAt: serverTimestamp() })
}

export function deleteMarketNote(userId, symbol) { return deleteDoc(doc(db, 'marketNotes', `${userId}_${symbol}`)) }
