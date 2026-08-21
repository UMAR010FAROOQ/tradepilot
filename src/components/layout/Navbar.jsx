import { useState } from 'react'
import { Bell, ChevronDown, LogOut, Menu, UserRound } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import Button from '../common/Button.jsx'
import SearchInput from '../common/SearchInput.jsx'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/markets': 'Markets',
  '/trade': 'Trade',
  '/portfolio': 'Portfolio',
  '/wallet': 'Wallet',
  '/deposit': 'Deposit',
  '/withdraw': 'Withdraw',
  '/transactions': 'Transactions',
  '/watchlist': 'Watchlist',
  '/profile': 'Profile',
  '/security': 'Security',
  '/support': 'Support',
  '/admin': 'Admin dashboard',
  '/admin/users': 'Users',
  '/admin/deposits': 'Deposits',
  '/admin/withdrawals': 'Withdrawals',
}

function getInitials(name, email) {
  if (name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
  }

  return email?.slice(0, 2).toUpperCase() || 'TP'
}

function Navbar({ onMenuClick }) {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [globalSearch, setGlobalSearch] = useState('')
  const { currentUser, userProfile, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const pageTitle = pageTitles[pathname] || 'TradePilot'
  const displayName = userProfile?.fullName || 'TradePilot user'
  const email = userProfile?.email || currentUser?.email || ''
  const initials = getInitials(userProfile?.fullName, email)

  const handleLogout = async () => {
    setLogoutError('')

    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      setLogoutError('Unable to log out. Please try again.')
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-18 items-center border-b border-border bg-canvas/90 px-4 backdrop-blur-xl md:left-18 md:px-5 xl:left-60 xl:px-7">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button
          aria-label="Open navigation"
          className="size-9 px-0 md:hidden"
          onClick={onMenuClick}
          variant="ghost"
        >
          <Menu aria-hidden="true" className="size-5" />
        </Button>
        <div className="min-w-0">
          <p className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-muted sm:block">
            Workspace
          </p>
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">{pageTitle}</p>
        </div>
      </div>

      <div className="mx-5 hidden w-full max-w-md lg:block" role="search">
        <SearchInput aria-label="Search markets" id="global-market-search" inputClassName="h-9 bg-surface" onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Search markets" value={globalSearch} />
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 sm:flex">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-50" />
            <span className="relative inline-flex size-2 rounded-full bg-positive" />
          </span>
          <span className="text-xs font-medium text-muted">Markets open</span>
        </div>
        <Button aria-label="Notifications" className="relative size-9 px-0" variant="ghost">
          <Bell aria-hidden="true" className="size-[18px]" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-negative" />
        </Button>
        <div className="relative">
          <button
            aria-controls="account-menu"
            aria-expanded={isAccountMenuOpen}
            aria-label="Open account menu"
            className="flex cursor-pointer items-center gap-2 rounded-lg p-1 transition hover:bg-elevated"
            onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
            type="button"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-accent/15 text-xs font-bold text-accent">
              {initials}
            </span>
            <span className="hidden max-w-36 text-left xl:block">
              <span className="block truncate text-xs font-semibold text-foreground">{displayName}</span>
              <span className="block truncate text-[10px] text-muted">{email}</span>
            </span>
            <ChevronDown aria-hidden="true" className="hidden size-3.5 text-muted xl:block" />
          </button>

          {isAccountMenuOpen && (
            <div
              className="absolute right-0 top-12 w-64 rounded-xl border border-border bg-elevated p-2 shadow-panel"
              id="account-menu"
            >
              <div className="border-b border-border px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{email}</p>
              </div>
              <Link
                className="mt-1 flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-muted transition hover:bg-surface hover:text-foreground"
                onClick={() => setIsAccountMenuOpen(false)}
                to="/profile"
              >
                <UserRound aria-hidden="true" className="size-4" />
                Profile
              </Link>
              <button
                className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-sm text-negative transition hover:bg-negative/10"
                onClick={handleLogout}
                type="button"
              >
                <LogOut aria-hidden="true" className="size-4" />
                Log out
              </button>
              {logoutError && <p className="px-3 py-2 text-xs text-negative">{logoutError}</p>}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
