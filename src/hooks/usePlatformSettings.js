import { useContext } from 'react'
import PlatformSettingsContext from '../context/platformSettingsContextValue.js'

export default function usePlatformSettings() {
  const context = useContext(PlatformSettingsContext)
  if (!context) throw new Error('usePlatformSettings must be used inside PlatformSettingsProvider.')
  return context
}
