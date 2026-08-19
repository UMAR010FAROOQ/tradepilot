import { useEffect, useState } from 'react'
import { BanknoteArrowDown, BanknoteArrowUp, Users, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import Badge from '../../components/common/Badge.jsx'
import Card from '../../components/common/Card.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/admin/AdminState.jsx'
import { getPendingDeposits, getPendingWithdrawals, getUsers } from '../../services/adminService.js'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { formatAdminDate } from '../../utils/adminFormatters.js'

function RequestList({ title, items, to }) {
  return (
    <Card padding="none">
      <div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">{title}</h2><Link className="text-xs font-semibold text-accent" to={to}>Review all</Link></div>
      {items.length === 0 ? <AdminEmpty title="Queue is clear" description="There are no pending requests." /> : <div className="divide-y divide-border">{items.slice(0, 4).map((item) => <div className="flex items-center gap-3 px-5 py-4" key={item.id}><span className="financial-value text-sm font-semibold">{formatCurrency(item.amount, item.currency)}</span><span className="min-w-0 flex-1 truncate text-xs text-muted">{item.userId}</span><Badge variant="warning">pending</Badge></div>)}</div>}
    </Card>
  )
}

function AdminDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    Promise.all([getUsers(), getPendingDeposits(), getPendingWithdrawals()])
      .then(([users, deposits, withdrawals]) => active && setData({ users, deposits, withdrawals }))
      .catch((requestError) => active && setError(getFirestoreErrorMessage(requestError)))
    return () => { active = false }
  }, [])

  const totalBalance = data?.users.reduce((sum, user) => sum + (user.wallet?.availableBalance || 0) + (user.wallet?.lockedBalance || 0), 0) || 0
  const cards = data ? [
    { label: 'Total users', value: data.users.length, icon: Users, to: '/admin/users' },
    { label: 'Pending deposits', value: data.deposits.length, icon: BanknoteArrowDown, to: '/admin/deposits' },
    { label: 'Pending withdrawals', value: data.withdrawals.length, icon: BanknoteArrowUp, to: '/admin/withdrawals' },
    { label: 'Total wallet balances', value: formatCurrency(totalBalance), icon: Wallet, to: '/admin/users' },
  ] : []
  const recentUsers = data ? [...data.users].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).slice(0, 5) : []

  return (
    <div className="space-y-6">
      <PageHeader description="Live account, request, and wallet information from Firestore." eyebrow="Administration" title="Operations overview" />
      <AdminError message={error} />
      {!data && !error ? <Card padding="none"><AdminLoading /></Card> : data && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, to }) => <Link key={label} to={to}><Card className="h-full transition hover:border-accent/40" elevated><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-muted">{label}</p><p className="financial-value mt-3 text-2xl font-semibold">{value}</p></div><span className="grid size-10 place-items-center rounded-lg bg-accent/10 text-accent"><Icon className="size-5" /></span></div></Card></Link>)}</div>
        <div className="grid gap-4 xl:grid-cols-2"><RequestList items={data.deposits} title="Pending deposits" to="/admin/deposits" /><RequestList items={data.withdrawals} title="Pending withdrawals" to="/admin/withdrawals" /></div>
        <Card padding="none"><div className="border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Recent users</h2></div>{recentUsers.length === 0 ? <AdminEmpty title="No users found" /> : <div className="divide-y divide-border">{recentUsers.map((user) => <div className="flex flex-wrap items-center gap-3 px-5 py-4" key={user.uid}><span className="grid size-9 place-items-center rounded-lg bg-accent/10 text-xs font-bold text-accent">{(user.fullName || user.email || 'U').slice(0, 2).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{user.fullName || 'Unnamed user'}</p><p className="truncate text-xs text-muted">{user.email}</p></div><Badge variant={user.role === 'admin' ? 'warning' : 'neutral'}>{user.role}</Badge><span className="text-xs text-muted">{formatAdminDate(user.createdAt)}</span></div>)}</div>}</Card>
      </>}
    </div>
  )
}

export default AdminDashboard
