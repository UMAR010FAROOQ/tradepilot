import { useEffect, useState } from 'react'
import { Bell, Check, CheckCheck, ChevronDown, LogOut, Menu, UserRound } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import Button from '../common/Button.jsx'
import IconButton from '../common/IconButton.jsx'
import { markAllNotificationsRead, markNotificationRead, subscribeToNotifications } from '../../services/notificationService.js'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/markets': 'Markets',
  '/trade': 'Trade',
  '/portfolio': 'Portfolio',
  '/active-trades': 'Active trades',
  '/analytics': 'Analytics',
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
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationError, setNotificationError] = useState('')
  const { currentUser, userProfile, logout } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const pageTitle = pageTitles[pathname] || 'TradePilot'
  const displayName = userProfile?.fullName || 'TradePilot user'
  const email = userProfile?.email || currentUser?.email || ''
  const initials = getInitials(userProfile?.fullName, email)
  const unreadCount = notifications.filter((item) => !item.read).length

  useEffect(() => {
    if (!currentUser?.uid) return undefined
    return subscribeToNotifications(currentUser.uid, setNotifications, () => setNotificationError('Notifications are unavailable until the latest Firestore rules and indexes are deployed.'))
  }, [currentUser?.uid])

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
        <IconButton
          aria-label="Open navigation"
          className="md:hidden"
          icon={Menu}
          iconSize="lg"
          onClick={onMenuClick}
          size="lg"
          variant="prominent"
        />
        <div className="min-w-0">
          <p className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-muted sm:block">
            Workspace
          </p>
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">{pageTitle}</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 sm:flex">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-50" />
            <span className="relative inline-flex size-2 rounded-full bg-positive" />
          </span>
          <span className="text-xs font-medium text-muted">Market data live</span>
        </div>
        <div className="relative"><IconButton aria-expanded={notificationsOpen} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} icon={Bell} iconSize="lg" onClick={() => setNotificationsOpen((value) => !value)} size="lg" variant={notificationsOpen || unreadCount ? 'prominent-active' : 'prominent'}>{unreadCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-canvas bg-negative px-1 text-[10px] font-bold text-white shadow-md">{unreadCount > 9 ? '9+' : unreadCount}</span>}</IconButton>
          {notificationsOpen && <section aria-label="Recent notifications" className="absolute right-0 top-12 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-elevated shadow-panel"><header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"><div><h2 className="text-sm font-semibold">Notifications</h2><p className="mt-0.5 text-[11px] text-muted">{unreadCount} unread</p></div><Button disabled={!unreadCount} onClick={async () => { try { await markAllNotificationsRead(notifications); setNotificationError('') } catch { setNotificationError('Unable to update notifications.') } }} size="sm" variant="ghost"><CheckCheck className="size-3.5" />Mark all read</Button></header>{notificationError && <p className="border-b border-border bg-warning/10 px-4 py-2 text-xs text-warning" role="status">{notificationError}</p>}<div className="max-h-96 overflow-y-auto">{notifications.length === 0 ? <p className="px-4 py-8 text-center text-sm text-muted">No notifications yet.</p> : notifications.slice(0, 8).map((item) => <article className={`border-b border-border px-4 py-3 last:border-0 ${item.read ? '' : 'bg-accent/5'}`} key={item.id}><div className="flex items-start gap-3"><span className={`mt-1 size-2 shrink-0 rounded-full ${item.read ? 'bg-muted/40' : 'bg-accent'}`} /><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{item.title}</h3><p className="mt-1 text-xs leading-5 text-muted">{item.message}</p><p className="mt-2 text-[10px] text-muted">{item.createdAt?.toDate?.().toLocaleString() || 'Just now'}</p></div>{!item.read && <button aria-label={`Mark ${item.title} as read`} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-foreground" onClick={async () => { try { await markNotificationRead(item.id); setNotificationError('') } catch { setNotificationError('Unable to update this notification.') } }} type="button"><Check className="size-4" /></button>}</div></article>)}</div></section>}
        </div>
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
