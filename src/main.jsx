import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppErrorBoundary from './components/common/AppErrorBoundary.jsx'
import './styles/global.css'

const root = createRoot(document.getElementById('root'))

import('./App.jsx')
  .then(({ default: App }) => root.render(<StrictMode><AppErrorBoundary><App /></AppErrorBoundary></StrictMode>))
  .catch((error) => {
    if (import.meta.env.DEV) console.error('TradePilot startup error', error)
    root.render(<main className="grid min-h-dvh place-items-center bg-canvas p-4 text-foreground"><section className="w-full max-w-lg rounded-2xl border border-negative/25 bg-surface p-8 text-center shadow-panel"><h1 className="text-xl font-semibold">TradePilot configuration required</h1><p className="mt-3 text-sm leading-6 text-muted">The application could not start. Verify the required Firebase browser configuration in your environment file, restart the development server, and reload.</p><button className="mt-6 min-h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white" onClick={() => window.location.reload()} type="button">Reload application</button></section></main>)
  })
