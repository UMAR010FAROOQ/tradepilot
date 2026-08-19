import { createContext, useEffect, useMemo, useState } from 'react'
import useAuth from '../hooks/useAuth.js'
import { subscribeToWallet } from '../services/walletService.js'
import { getFirestoreErrorMessage } from '../utils/firestoreErrors.js'

const WalletContext = createContext(undefined)

const initialWalletState = {
  userId: null,
  wallet: null,
  error: '',
}

function WalletProvider({ children }) {
  const { currentUser, loading: authLoading } = useAuth()
  const [walletState, setWalletState] = useState(initialWalletState)

  useEffect(() => {
    if (authLoading || !currentUser) return undefined

    return subscribeToWallet(
      currentUser.uid,
      (nextWallet) => {
        setWalletState({
          userId: currentUser.uid,
          wallet: nextWallet,
          error: nextWallet ? '' : 'Your wallet has not been initialized yet.',
        })
      },
      (firestoreError) => {
        setWalletState({
          userId: currentUser.uid,
          wallet: null,
          error: getFirestoreErrorMessage(firestoreError),
        })
      },
    )
  }, [authLoading, currentUser])

  const value = useMemo(() => {
    if (authLoading || !currentUser) {
      return { wallet: null, loading: authLoading, error: '' }
    }

    if (walletState.userId !== currentUser.uid) {
      return { wallet: null, loading: true, error: '' }
    }

    return {
      wallet: walletState.wallet,
      loading: false,
      error: walletState.error,
    }
  }, [authLoading, currentUser, walletState])

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export { WalletContext, WalletProvider }
