import { Component } from 'react'
import { CircleAlert, RefreshCw, ShieldCheck } from 'lucide-react'
import Button from './Button.jsx'

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('TradePilot render error', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return <main className="grid min-h-dvh place-items-center bg-canvas p-4 text-foreground"><section className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-panel"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-negative/10 text-negative"><CircleAlert className="size-6" /></span><h1 className="mt-5 text-xl font-semibold">TradePilot could not display this page</h1><p className="mt-2 text-sm leading-6 text-muted">An unexpected interface error occurred. Reload the application to recover your session.</p><Button className="mt-6" onClick={() => window.location.reload()}><RefreshCw className="size-4" />Reload application</Button><div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted"><ShieldCheck className="size-4" />No diagnostic details are exposed here.</div></section></main>
  }
}

export default AppErrorBoundary
