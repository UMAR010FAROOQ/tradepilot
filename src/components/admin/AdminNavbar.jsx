import { Menu, ShieldCheck } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import Button from '../common/Button.jsx'

const titles = {
  '/admin': 'Overview', '/admin/users': 'Users', '/admin/deposits': 'Deposits',
  '/admin/withdrawals': 'Withdrawals', '/admin/transactions': 'Transactions',
  '/admin/trades': 'Trades',
}

function AdminNavbar({ onMenuClick }) {
  const { pathname } = useLocation()
  const { currentUser, userProfile } = useAuth()
  const name = userProfile?.fullName || 'Administrator'

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-18 items-center border-b border-border bg-canvas/90 px-4 backdrop-blur-xl md:left-64 md:px-7">
      <Button aria-label="Open admin navigation" className="mr-3 size-9 px-0 md:hidden" onClick={onMenuClick} variant="ghost"><Menu className="size-5" /></Button>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Admin console</p>
        <p className="truncate text-base font-semibold">{titles[pathname] || 'Administration'}</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden items-center gap-2 rounded-full border border-positive/20 bg-positive/10 px-3 py-1.5 text-xs font-medium text-positive sm:flex"><ShieldCheck className="size-3.5" /> Admin session</span>
        <span className="grid size-8 place-items-center rounded-lg bg-accent/15 text-xs font-bold text-accent">{name.slice(0, 2).toUpperCase()}</span>
        <span className="hidden max-w-44 sm:block"><span className="block truncate text-xs font-semibold">{name}</span><span className="block truncate text-[10px] text-muted">{currentUser?.email}</span></span>
      </div>
    </header>
  )
}

export default AdminNavbar
