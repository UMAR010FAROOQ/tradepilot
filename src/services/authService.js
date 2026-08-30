import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
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
