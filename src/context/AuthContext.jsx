import { createContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../services/firebase.js'
import * as authService from '../services/authService.js'
import { initializeUserAccount } from '../services/accountService.js'

const AuthContext = createContext(undefined)
const profileCache = new Map()

async function sendVerificationAndSignOut(user) {
  let verificationError = null
  try {
    await authService.sendVerificationEmail(user)
  } catch (error) {
    verificationError = error
  }
  await authService.logout()
  return { verificationSent: !verificationError, verificationError }
}

function createProfileFallback(user) {
  return {
    uid: user.uid,
    fullName: user.displayName || '',
    email: user.email || '',
    role: 'user',
    accountStatus: 'active',
    profileMissing: true,
  }
}

function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [verificationRevision, setVerificationRevision] = useState(0)

  useEffect(() => {
    let isActive = true
    let unsubscribeProfile = () => {}

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!isActive) return
      unsubscribeProfile()

      setCurrentUser(user)
      setLoading(true)

      if (!user) {
        setUserProfile(null)
        setLoading(false)
        return
      }

      unsubscribeProfile = onSnapshot(
        doc(db, 'users', user.uid),
        (snapshot) => {
          if (!isActive) return
          const profile = snapshot.exists() ? snapshot.data() : createProfileFallback(user)
          profileCache.set(user.uid, profile)
          setUserProfile(profile)
          setLoading(false)
          if (snapshot.exists()) {
            initializeUserAccount(user).catch(() => {
              // WalletContext exposes a recoverable missing-wallet error if setup remains incomplete.
            })
          }
        },
        () => {
          if (!isActive) return
          setUserProfile(createProfileFallback(user))
          setLoading(false)
        },
      )

    })

    return () => {
      isActive = false
      unsubscribeProfile()
      unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      currentUser,
      userProfile,
      loading,
      verificationRevision,
      signup: async (email, password, fullName) => {
        const credential = await authService.signup(email, password)
        setCurrentUser(credential.user)

        try {
          const profile = await authService.createUserProfile(credential.user, fullName)
          const resolvedProfile = {
            ...profile,
            createdAt: null,
            updatedAt: null,
          }

          profileCache.set(credential.user.uid, resolvedProfile)
          setUserProfile(resolvedProfile)
          await initializeUserAccount(credential.user)
          const verification = await sendVerificationAndSignOut(credential.user)
          return { credential, ...verification }
        } catch (error) {
          const setupError = new Error('The authentication account exists, but setup is incomplete.')
          setupError.code = 'account/initialization-failed'
          setupError.cause = error
          throw setupError
        }
      },
      login: async (email, password) => {
        const credential = await authService.login(email, password)
        setCurrentUser(credential.user)
        return credential
      },
      logout: async () => {
        if (currentUser) profileCache.delete(currentUser.uid)
        await authService.logout()
      },
      resetPassword: authService.resetPassword,
      completeSignupVerification: async () => {
        if (!currentUser) {
          const error = new Error('A signed-in account is required to send verification.')
          error.code = 'auth/requires-authentication'
          throw error
        }
        return sendVerificationAndSignOut(currentUser)
      },
      resendVerification: async (email, password) => {
        if (currentUser) {
          if (currentUser.emailVerified) return { alreadyVerified: true }
          await authService.sendVerificationEmail(currentUser)
          return { alreadyVerified: false }
        }
        return authService.resendVerificationWithCredentials(email, password)
      },
      refreshEmailVerification: async () => {
        const verified = await authService.refreshEmailVerification(currentUser)
        setVerificationRevision((revision) => revision + 1)
        return verified
      },
      updateProfileName: async (fullName) => {
        const cleanName = await authService.updateProfileName(currentUser.uid, fullName)
        const nextProfile = { ...userProfile, fullName: cleanName }
        profileCache.set(currentUser.uid, nextProfile)
        setUserProfile(nextProfile)
        return nextProfile
      },
      initializeAccount: async (fullName) => {
        if (!currentUser) {
          const error = new Error('A signed-in user is required to initialize an account.')
          error.code = 'account/initialization-failed'
          throw error
        }

        const profile = await authService.ensureUserProfile(currentUser, fullName)
        await initializeUserAccount(currentUser)
        profileCache.set(currentUser.uid, profile)
        setUserProfile(profile)
        return profile
      },
    }),
    [currentUser, loading, userProfile, verificationRevision],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext, AuthProvider }
