import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

function NetworkStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  }, [])
  if (online) return null
  return <div className="fixed inset-x-3 bottom-3 z-[70] mx-auto flex max-w-md items-center justify-center gap-2 rounded-lg border border-warning/30 bg-elevated px-4 py-3 text-sm text-warning shadow-panel" role="status"><WifiOff className="size-4 shrink-0" /><span><strong>Offline.</strong> Market data may be unavailable.</span></div>
}
export default NetworkStatus
