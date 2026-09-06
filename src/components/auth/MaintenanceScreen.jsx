import { Construction, LogOut } from 'lucide-react'
import useAuth from '../../hooks/useAuth.js'
import Button from '../common/Button.jsx'

export default function MaintenanceScreen() {
  const { logout } = useAuth()
  return <main className="grid min-h-dvh place-items-center bg-canvas p-4 text-foreground"><section className="w-full max-w-md rounded-2xl border border-warning/25 bg-surface p-8 text-center"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-warning/10 text-warning"><Construction className="size-6" /></span><h1 className="mt-5 text-xl font-semibold">TradePilot Maintenance</h1><p className="mt-2 text-sm leading-6 text-muted">TradePilot is temporarily unavailable while the platform is being maintained. Please check back shortly.</p><Button className="mt-6" onClick={logout} variant="secondary"><LogOut className="size-4" />Sign out</Button></section></main>
}
