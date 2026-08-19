import { useContext } from 'react'
import { WalletContext } from '../context/WalletContext.jsx'

function useWallet() {
  const context = useContext(WalletContext)

  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider.')
  }

  return context
}

export default useWallet
