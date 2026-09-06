import { CircleAlert, LifeBuoy, LogOut } from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'
import Button from '../common/Button.jsx'

export default function AccountRestricted({ status }) {
  const { logout } = useAuth()
  const suspended = status === 'suspended'
  return <main className="grid min-h-dvh place-items-center bg-canvas p-4 text-foreground"><section className="w-full max-w-md rounded-2xl border border-warning/25 bg-surface p-8 text-center"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-warning/10 text-warning"><CircleAlert className="size-6" /></span><h1 className="mt-5 text-xl font-semibold">{suspended ? 'Account Suspended' : 'Account access unavailable'}</h1><p className="mt-2 text-sm leading-6 text-muted">{suspended ? 'Your TradePilot account is currently suspended. Contact support if you believe this is an error.' : `This account is currently ${status || 'inactive'} and cannot access the TradePilot workspace.`}</p><div className="mt-6 flex flex-wrap justify-center gap-3"><a className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-elevated px-4 text-sm font-semibold transition hover:border-accent/40" href="mailto:support@tradepilot.app"><LifeBuoy className="size-4" />Contact Support</a><Button onClick={logout} variant="secondary"><LogOut className="size-4" />Sign out</Button></div></section></main>
}
