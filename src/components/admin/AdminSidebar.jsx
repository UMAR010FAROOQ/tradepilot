import { BanknoteArrowDown, BanknoteArrowUp, CandlestickChart, LayoutDashboard, LogOut, ReceiptText, Users, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import IconButton from '../common/IconButton.jsx'
import { cn } from '../../utils/cn.js'

const links = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/deposits', label: 'Deposits', icon: BanknoteArrowDown },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: BanknoteArrowUp },
  { to: '/admin/trades', label: 'Trades', icon: CandlestickChart },
  { to: '/admin/transactions', label: 'Transactions', icon: ReceiptText },
]

function AdminSidebar({ className, mobile = false, onClose }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className={cn('flex h-dvh w-64 flex-col border-r border-border bg-surface', className)}>
      <div className="flex h-18 items-center justify-between border-b border-border px-5">
        <div>
          <p className="text-base font-bold tracking-tight">TradePilot</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Administration</p>
        </div>
        {mobile && <IconButton aria-label="Close navigation" icon={X} iconSize="lg" onClick={onClose} size="lg" variant="close" />}
      </div>
      <nav aria-label="Admin navigation" className="sidebar-scrollbar flex-1 space-y-1 overflow-y-auto p-3">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            className={({ isActive }) => cn('flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted transition hover:bg-elevated hover:text-foreground', isActive && 'bg-accent/12 text-accent')}
            end={end}
            key={to}
            onClick={onClose}
            to={to}
          >
            <Icon aria-hidden="true" className="size-[18px]" />{label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <button className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted transition hover:bg-negative/10 hover:text-negative" onClick={handleLogout} type="button">
          <LogOut className="size-[18px]" /> Log out
        </button>
      </div>
    </aside>
  )
}

export default AdminSidebar
