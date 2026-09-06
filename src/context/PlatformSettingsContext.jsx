import { useEffect, useMemo, useState } from 'react'
import PlatformSettingsContext from './platformSettingsContextValue.js'
import { DEFAULT_PLATFORM_SETTINGS, subscribeToPlatformSettings } from '../services/platformSettingsService.js'

export function PlatformSettingsProvider({ children }) {
  const [settings, setSettings] = useState({ ...DEFAULT_PLATFORM_SETTINGS })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => subscribeToPlatformSettings(
    (next) => { setSettings(next); setError(null); setLoading(false) },
    (nextError) => { setError(nextError); setLoading(false) },
  ), [])

  const value = useMemo(() => ({ settings, loading, error }), [settings, loading, error])
  return <PlatformSettingsContext.Provider value={value}>{children}</PlatformSettingsContext.Provider>
}
