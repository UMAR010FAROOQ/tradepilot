import { Bell, ChevronDown, Menu, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import Button from '../common/Button.jsx'

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

function Navbar({ onMenuClick }) {
  const { pathname } = useLocation()
  const pageTitle = pageTitles[pathname] || 'TradePilot'

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
        <label className="sr-only" htmlFor="global-market-search">
          Search markets
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <input
            className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-14 text-sm text-foreground placeholder:text-muted/70 focus:border-accent focus:outline-none"
            id="global-market-search"
            placeholder="Search markets"
            type="search"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-elevated px-1.5 py-0.5 font-sans text-[10px] text-muted">
            ⌘ K
          </kbd>
        </div>
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
        <button
          aria-label="Open account menu"
          className="flex cursor-pointer items-center gap-2 rounded-lg p-1 transition hover:bg-elevated"
          type="button"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-accent/15 text-xs font-bold text-accent">
            TP
          </span>
          <span className="hidden text-left xl:block">
            <span className="block text-xs font-semibold text-foreground">Demo Account</span>
            <span className="block text-[10px] text-muted">Standard</span>
          </span>
          <ChevronDown aria-hidden="true" className="hidden size-3.5 text-muted xl:block" />
        </button>
      </div>
    </header>
  )
}

export default Navbar
