import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'

let environment
const profile = (uid, role = 'user', accountStatus = 'active') => ({ uid, fullName: uid, email: `${uid}@example.test`, role, accountStatus, createdAt: new Date(), updatedAt: new Date() })

beforeAll(async () => { environment = await initializeTestEnvironment({ projectId: 'demo-tradepilot-rules', firestore: { rules: await readFile('firestore.rules', 'utf8') } }) })
beforeEach(async () => { await environment.clearFirestore(); await environment.withSecurityRulesDisabled(async (context) => { const store = context.firestore(); await setDoc(doc(store, 'users', 'user-a'), profile('user-a')); await setDoc(doc(store, 'users', 'user-b'), profile('user-b')); await setDoc(doc(store, 'users', 'admin-a'), profile('admin-a', 'admin')); await setDoc(doc(store, 'wallets', 'user-a'), { userId: 'user-a', currency: 'USD', availableBalance: 100, lockedBalance: 0, totalDeposited: 100, totalWithdrawn: 0, createdAt: new Date(), updatedAt: new Date() }); await setDoc(doc(store, 'adminUserNotes', 'note-a'), { userId: 'user-a', adminUserId: 'admin-a', note: 'Private', createdAt: new Date(), updatedAt: new Date() }); await setDoc(doc(store, 'auditLogs', 'audit-a'), { actorUserId: 'admin-a', targetUserId: 'user-a', action: 'role_changed', resourceType: 'user', resourceId: 'user-a', metadata: { from: 'user', to: 'admin' }, createdAt: new Date() }); await setDoc(doc(store, 'trades', 'trade-a'), { userId: 'user-a', side: 'BUY' }) }) })
afterAll(async () => environment?.cleanup())

describe('Firestore security boundary', () => {
  const userStore = () => environment.authenticatedContext('user-a', { email_verified: true, firebase: { sign_in_provider: 'password' } }).firestore()
  const adminStore = () => environment.authenticatedContext('admin-a', { email_verified: true, firebase: { sign_in_provider: 'password' } }).firestore()
  it('allows a user to read their own profile', () => assertSucceeds(getDoc(doc(userStore(), 'users', 'user-a'))))
  it('denies another user profile', () => assertFails(getDoc(doc(userStore(), 'users', 'user-b'))))
  it('denies direct wallet edits', () => assertFails(updateDoc(doc(userStore(), 'wallets', 'user-a'), { availableBalance: 999 })))
  it('denies self role and account-status changes', async () => { await assertFails(updateDoc(doc(userStore(), 'users', 'user-a'), { role: 'admin', updatedAt: serverTimestamp() })); await assertFails(updateDoc(doc(userStore(), 'users', 'user-a'), { accountStatus: 'suspended', updatedAt: serverTimestamp() })) })
  it('denies normal-user access to admin notes and audit logs', async () => { await assertFails(getDoc(doc(userStore(), 'adminUserNotes', 'note-a'))); await assertFails(getDoc(doc(userStore(), 'auditLogs', 'audit-a'))) })
  it('denies mutation of immutable trades', () => assertFails(updateDoc(doc(userStore(), 'trades', 'trade-a'), { side: 'SELL' })))
  it('permits only admins to write platform settings', async () => { const data = { maintenanceMode: false, allowSignup: true, allowTrading: true, allowDeposits: true, allowWithdrawals: true, updatedAt: serverTimestamp(), updatedBy: 'user-a' }; await assertFails(setDoc(doc(userStore(), 'platformSettings', 'config'), data)); await assertSucceeds(setDoc(doc(adminStore(), 'platformSettings', 'config'), { ...data, updatedBy: 'admin-a' })) })
})
