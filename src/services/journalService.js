import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { createServiceError } from '../utils/firestoreErrors.js'
import { db } from './firebase.js'

const journalIdFor = (userId, tradeId) => `${userId}_${tradeId}`
const normalizeTags = (tags) => [...new Set(tags.map((tag) => tag.trim().replace(/\s+/g, ' ')).filter(Boolean))]

export async function getJournalForTrade(userId, tradeId) {
  const snapshot = await getDoc(doc(db, 'tradeJournal', journalIdFor(userId, tradeId)))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export function subscribeToJournal(userId, callback, onError) {
  return onSnapshot(query(collection(db, 'tradeJournal'), where('userId', '==', userId), orderBy('createdAt', 'desc')), (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), onError)
}

export async function saveJournalEntry({ userId, tradeId, symbol, title, notes, tags, rating }) {
  const cleanTitle = title.trim(), cleanNotes = notes.trim(), cleanTags = normalizeTags(tags)
  const resolvedRating = rating === '' || rating === null ? null : Number(rating)
  if (!cleanTitle || cleanTitle.length > 120) throw createServiceError('journal/invalid-title', 'Enter a title up to 120 characters.')
  if (cleanNotes.length > 5000) throw createServiceError('journal/notes-too-long', 'Journal notes cannot exceed 5,000 characters.')
  if (cleanTags.length > 5 || cleanTags.some((tag) => tag.length > 30)) throw createServiceError('journal/invalid-tags', 'Use up to five tags of 30 characters each.')
  if (resolvedRating !== null && (!Number.isInteger(resolvedRating) || resolvedRating < 1 || resolvedRating > 5)) throw createServiceError('journal/invalid-rating', 'Trade Review Rating must be between 1 and 5.')
  const entryRef = doc(db, 'tradeJournal', journalIdFor(userId, tradeId))
  const existing = await getDoc(entryRef)
  await setDoc(entryRef, { userId, tradeId, symbol, title: cleanTitle, notes: cleanNotes, tags: cleanTags, rating: resolvedRating, createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(), updatedAt: serverTimestamp() })
  return entryRef.id
}

export function deleteJournalEntry(entryId) { return deleteDoc(doc(db, 'tradeJournal', entryId)) }
