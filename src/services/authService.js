import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getIdToken,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from './firebase.js'

export function signup(email, password) {
  return createUserWithEmailAndPassword(auth, email, password)
}

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
}

export function logout() {
  return signOut(auth)
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email)
}

export function sendVerificationEmail(user = auth.currentUser) {
  if (!user) {
    const error = new Error('Sign in before requesting another verification email.')
    error.code = 'auth/requires-authentication'
    throw error
  }
  return sendEmailVerification(user)
}

export async function refreshEmailVerification(user = auth.currentUser) {
  if (!user) {
    const error = new Error('Sign in before checking email verification.')
    error.code = 'auth/requires-authentication'
    throw error
  }
  await reload(user)
  await getIdToken(user, true)
  return user.emailVerified
}

export async function resendVerificationWithCredentials(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  try {
    if (credential.user.emailVerified) return { alreadyVerified: true }
    await sendEmailVerification(credential.user)
    return { alreadyVerified: false }
  } finally {
    await signOut(auth)
  }
}

export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser
  if (!user?.email) throw new Error('No authenticated email account is available.')
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)
  return updatePassword(user, newPassword)
}

export async function updateProfileName(userId, fullName) {
  const cleanName = fullName.trim()
  if (!cleanName) throw new Error('Full name is required.')
  await updateDoc(doc(db, 'users', userId), { fullName: cleanName, updatedAt: serverTimestamp() })
  return cleanName
}

export async function createUserProfile(user, fullName) {
  const profile = {
    uid: user.uid,
    fullName: fullName.trim(),
    email: user.email,
    role: 'user',
    accountStatus: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(doc(db, 'users', user.uid), profile)
  return profile
}

export async function ensureUserProfile(user, fullName) {
  const profileRef = doc(db, 'users', user.uid)
  const snapshot = await getDoc(profileRef)

  if (snapshot.exists()) return snapshot.data()
  return createUserProfile(user, fullName)
}
