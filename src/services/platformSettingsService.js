import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'
import { createServiceError } from '../utils/firestoreErrors.js'

export const DEFAULT_PLATFORM_SETTINGS = Object.freeze({
  maintenanceMode: false,
  allowSignup: true,
  allowTrading: true,
  allowDeposits: true,
  allowWithdrawals: true,
})

const settingsRef = () => doc(db, 'platformSettings', 'config')

export function normalizePlatformSettings(value = {}) {
  return Object.fromEntries(Object.entries(DEFAULT_PLATFORM_SETTINGS).map(([key, fallback]) => [key, typeof value[key] === 'boolean' ? value[key] : fallback]))
}

export async function getPlatformSettings() {
  const snapshot = await getDoc(settingsRef())
  return snapshot.exists() ? normalizePlatformSettings(snapshot.data()) : { ...DEFAULT_PLATFORM_SETTINGS }
}

export function subscribeToPlatformSettings(callback, onError) {
  return onSnapshot(settingsRef(), (snapshot) => callback(snapshot.exists() ? normalizePlatformSettings(snapshot.data()) : { ...DEFAULT_PLATFORM_SETTINGS }), onError)
}

export async function requirePlatformFeature(feature, message) {
  const settings = await getPlatformSettings()
  if (settings[feature] === false) throw createServiceError('platform/feature-disabled', message)
  return settings
}

export async function savePlatformSettings(userId, settings) {
  if (!userId) throw createServiceError('admin/unauthorized', 'Administrator access is required.')
  const normalized = normalizePlatformSettings(settings)
  await setDoc(settingsRef(), { ...normalized, updatedAt: serverTimestamp(), updatedBy: userId }, { merge: false })
  return normalized
}
