import { useEffect, useState } from 'react'
import { Activity, BanknoteArrowDown, BanknoteArrowUp, BriefcaseBusiness, CircleDollarSign, Clock3, ReceiptText, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import Badge from '../../components/common/Badge.jsx'
import Card from '../../components/common/Card.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import { AdminError, AdminLoading } from '../../components/admin/AdminState.jsx'
import { getAdminDashboardData } from '../../services/adminService.js'
import { auth } from '../../services/firebase.js'
import { getTicker } from '../../services/marketService.js'
import { formatAdminDate } from '../../utils/adminFormatters.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'

const statusCheck = async (symbol) => { try { await getTicker(symbol); return 'Operational' } catch { return 'Unavailable' } }

export default function AdminDashboard() {
  const [data, setData] = useState(null), [error, setError] = useState(''), [health, setHealth] = useState({ binance: 'Checking', forex: 'Checking' })
  useEffect(() => { let active = true; getAdminDashboardData().then((value) => active && setData(value)).catch((e) => active && setError(getFirestoreErrorMessage(e))); Promise.all([statusCheck('BTCUSDT'), statusCheck('EURUSD')]).then(([binance, forex]) => active && setHealth({ binance, forex })); return () => { active = false } }, [])
  if (!data && !error) return <div className="space-y-6"><PageHeader eyebrow="Administration" title="Operations overview" description="Loading live operational metrics." /><Card><AdminLoading /></Card></div>

  const deposits = data?.deposits || [], withdrawals = data?.withdrawals || [], trades = data?.trades || [], positions = data?.positions || [], orders = data?.orders || [], users = data?.users || []
  const pendingDeposits = deposits.filter((item) => item.status === 'pending').length
  const pendingWithdrawals = withdrawals.filter((item) => item.status === 'pending').length
  const pendingOrders = orders.filter((item) => item.status === 'pending').length
  const cards = [
    ['Total users', users.length, Users, '/admin/users'], ['Active users', users.filter((item) => item.accountStatus === 'active').length, Users, '/admin/users'], ['Suspended users', users.filter((item) => item.accountStatus === 'suspended').length, Users, '/admin/users'], ['Admins', users.filter((item) => item.role === 'admin').length, Users, '/admin/users'],
    ['Pending deposits', pendingDeposits, BanknoteArrowDown, '/admin/deposits'], ['Pending withdrawals', pendingWithdrawals, BanknoteArrowUp, '/admin/withdrawals'], ['Total wallet balances', formatCurrency(users.reduce((sum, item) => sum + (item.wallet?.availableBalance || 0) + (item.wallet?.lockedBalance || 0), 0)), Wallet, '/admin/users'],
    ['Approved deposits', formatCurrency(deposits.filter((item) => item.status === 'approved').reduce((sum, item) => sum + (item.amount || 0), 0)), CircleDollarSign, '/admin/deposits'], ['Approved withdrawals', formatCurrency(withdrawals.filter((item) => item.status === 'approved').reduce((sum, item) => sum + (item.amount || 0), 0)), CircleDollarSign, '/admin/withdrawals'],
    ['Total trades', trades.length, ReceiptText, '/admin/trades'], ['Open positions', positions.filter((item) => item.status === 'open' && item.quantity > 0).length, BriefcaseBusiness, '/admin/trades'], ['Trading volume', formatCurrency(trades.reduce((sum, item) => sum + (item.grossAmount || 0), 0)), Activity, '/admin/trades'], ['Pending orders', pendingOrders, Clock3, '/admin/trades'], ['Unread operational items', pendingDeposits + pendingWithdrawals + pendingOrders, Clock3, '/admin/audit-logs'],
  ]
  const systems = [['Firestore', error ? 'Unavailable' : 'Operational'], ['Firebase Auth', auth.currentUser ? 'Operational' : 'Unavailable'], ['Binance market data', health.binance], ['Forex proxy', health.forex], ['Notification system', error ? 'Unavailable' : 'Operational']]
  const recentActivity = [...(data?.auditLogs || []), ...users.map((user) => ({ id: `user-${user.uid}`, action: 'new_user', targetUserId: user.uid, resourceId: user.uid, createdAt: user.createdAt })), ...trades.slice(0, 10).map((trade) => ({ id: `trade-${trade.id}`, action: `${trade.side?.toLowerCase()}_trade`, targetUserId: trade.userId, resourceId: trade.symbol, createdAt: trade.createdAt }))].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).slice(0, 10)

  return <div className="space-y-6"><PageHeader eyebrow="Administration" title="Operations overview" description="Live platform, account, funding, and trading intelligence." /><AdminError message={error} />{data && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([label, value, Icon, to]) => <Link key={label} to={to}><Card className="h-full transition hover:border-accent/40"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs text-muted">{label}</p><p className="financial-value mt-3 truncate text-xl font-semibold">{value}</p></div><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><Icon className="size-4" /></span></div></Card></Link>)}</div><div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]"><Card padding="none"><div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Recent Platform Activity</h2><Link className="text-xs font-semibold text-accent" to="/admin/audit-logs">View audit log</Link></div><div className="divide-y divide-border">{recentActivity.length ? recentActivity.map((item) => <div className="flex flex-wrap items-center gap-3 px-5 py-4" key={item.id}><Badge variant="neutral">{item.action.replaceAll('_', ' ')}</Badge><p className="min-w-0 flex-1 truncate font-mono text-xs text-muted">{item.targetUserId || item.resourceId}</p><span className="text-xs text-muted">{formatAdminDate(item.createdAt)}</span></div>) : <p className="p-6 text-sm text-muted">No platform activity found.</p>}</div></Card><Card><h2 className="text-sm font-semibold">System Health</h2><p className="mt-1 text-xs text-muted">Lightweight checks; no background polling.</p><div className="mt-4 divide-y divide-border">{systems.map(([label, value]) => <div className="flex items-center justify-between gap-3 py-3" key={label}><span className="text-sm">{label}</span><Badge variant={value === 'Operational' ? 'positive' : value === 'Checking' ? 'warning' : 'negative'}>{value}</Badge></div>)}</div></Card></div></>}</div>
}
