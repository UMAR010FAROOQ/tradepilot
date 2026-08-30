import { createContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../services/firebase.js'
import * as authService from '../services/authService.js'
import { initializeUserAccount } from '../services/accountService.js'

const AuthContext = createContext(undefined)
const profileCache = new Map()
const profileRequests = new Map()
const PROFILE_READ_TIMEOUT = 10000

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

function withProfileTimeout(request) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new Error('Firestore profile request timed out.')),
      PROFILE_READ_TIMEOUT,
    )

    request.then(
      (profile) => {
        clearTimeout(timeoutId)
        resolve(profile)
      },
      (error) => {
        clearTimeout(timeoutId)
        reject(error)
      },
    )
  })
}

async function fetchUserProfile(user) {
  if (profileCache.has(user.uid)) return profileCache.get(user.uid)

  if (!profileRequests.has(user.uid)) {
    const request = getDoc(doc(db, 'users', user.uid))
      .then((snapshot) =>
        snapshot.exists() ? snapshot.data() : createProfileFallback(user),
      )
      .then((profile) => {
        profileCache.set(user.uid, profile)
        return profile
      })
      .finally(() => profileRequests.delete(user.uid))

    profileRequests.set(user.uid, request)
  }

  return withProfileTimeout(profileRequests.get(user.uid))
}

function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isActive) return

      setCurrentUser(user)

      if (!user) {
        setUserProfile(null)
        setLoading(false)
        return
      }

      try {
        const profile = await fetchUserProfile(user)
        if (isActive) setUserProfile(profile)
      } catch {
        if (isActive) setUserProfile(createProfileFallback(user))
      } finally {
        if (isActive) setLoading(false)
      }

      initializeUserAccount(user).catch(() => {
        // WalletContext exposes a recoverable missing-wallet error if setup remains incomplete.
      })
    })

    return () => {
      isActive = false
      unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      currentUser,
      userProfile,
      loading,
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
          return credential
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
    [currentUser, loading, userProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext, AuthProvider }
