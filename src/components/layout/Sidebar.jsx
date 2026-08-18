import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CircleHelp,
  Gauge,
  LogOut,
  LockKeyhole,
  ShieldCheck,
  Star,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../utils/cn.js'
import Button from '../common/Button.jsx'

const navigationGroups = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: Gauge },
      { label: 'Markets', path: '/markets', icon: BarChart3 },
      { label: 'Trade', path: '/trade', icon: ArrowLeftRight },
      { label: 'Portfolio', path: '/portfolio', icon: BriefcaseBusiness },
      { label: 'Wallet', path: '/wallet', icon: WalletCards },
    ],
  },
  {
    label: 'Activity',
    items: [
      { label: 'Transactions', path: '/transactions', icon: BookOpen },
      { label: 'Watchlist', path: '/watchlist', icon: Star },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile', path: '/profile', icon: UserRound },
      { label: 'Security', path: '/security', icon: LockKeyhole },
      { label: 'Support', path: '/support', icon: CircleHelp },
    ],
  },
]

function BrandMark() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-white">
      <ShieldCheck aria-hidden="true" className="size-4" />
    </span>
  )
}

function Sidebar({ mobile = false, onClose, className }) {
  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        'flex h-dvh flex-col border-r border-border bg-surface',
        mobile ? 'w-64' : 'w-18 xl:w-60',
        className,
      )}
    >
      <div className="flex h-18 shrink-0 items-center justify-between border-b border-border px-4 xl:px-5">
        <NavLink
          aria-label="TradePilot dashboard"
          className="flex min-w-0 items-center gap-3"
          onClick={onClose}
          to="/dashboard"
        >
          <BrandMark />
          <span className={cn('text-base font-bold tracking-tight', !mobile && 'hidden xl:block')}>
            TradePilot
          </span>
        </NavLink>
        {mobile && (
          <Button
            aria-label="Close navigation"
            className="size-9 px-0"
            onClick={onClose}
            variant="ghost"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        )}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {navigationGroups.map((group, groupIndex) => (
          <div className={cn(groupIndex > 0 && 'mt-6')} key={group.label}>
            <p
              className={cn(
                'mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted/70',
                !mobile && 'hidden xl:block',
              )}
            >
              {group.label}
            </p>
            <div className="grid gap-1">
              {group.items.map(({ label, path, icon: Icon }) => (
                <NavLink
                  className={({ isActive }) =>
                    cn(
                      'group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition',
                      isActive
                        ? 'bg-accent/12 text-accent'
                        : 'text-muted hover:bg-elevated hover:text-foreground',
                      !mobile && 'justify-center xl:justify-start',
                    )
                  }
                  key={path}
                  onClick={onClose}
                  title={!mobile ? label : undefined}
                  to={path}
                >
                  <Icon aria-hidden="true" className="size-[18px] shrink-0" />
                  <span className={cn(!mobile && 'hidden xl:block')}>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <Button
          aria-label="Log out"
          className={cn('w-full', !mobile && 'px-0 xl:justify-start xl:px-3')}
          title="Log out"
          variant="ghost"
        >
          <LogOut aria-hidden="true" className="size-[18px] shrink-0" />
          <span className={cn(!mobile && 'hidden xl:block')}>Log out</span>
        </Button>
      </div>
    </aside>
  )
}

export default Sidebar
