import { useEffect, useMemo, useState } from 'react'
import Badge from '../../components/common/Badge.jsx'
import Card from '../../components/common/Card.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import SearchInput from '../../components/common/SearchInput.jsx'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/admin/AdminState.jsx'
import { getUsers } from '../../services/adminService.js'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { formatAdminDate, statusVariant } from '../../utils/adminFormatters.js'

function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => { getUsers().then(setUsers).catch((requestError) => setError(getFirestoreErrorMessage(requestError))).finally(() => setLoading(false)) }, [])
  const visible = useMemo(() => users.filter((user) => `${user.fullName} ${user.email} ${user.uid}`.toLowerCase().includes(search.toLowerCase())), [users, search])
  return (
    <div className="space-y-6">
      <PageHeader description="Account profiles and wallet balances. This view is read-only." eyebrow="Administration" title="Users" />
      <AdminError message={error} />
      <Card padding="none">
        <div className="border-b border-border p-4"><SearchInput aria-label="Search users" className="max-w-md" onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or user ID" value={search} /></div>
        {loading ? <AdminLoading /> : visible.length === 0 ? <AdminEmpty title="No users found" /> : <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left">
          <thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-[0.14em] text-muted"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">UID</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Available</th><th className="px-5 py-3">Deposited</th><th className="px-5 py-3">Created</th></tr></thead>
          <tbody className="divide-y divide-border">{visible.map((user) => <tr key={user.uid}><td className="px-5 py-4"><p className="text-sm font-medium">{user.fullName || 'Unnamed user'}</p><p className="mt-0.5 text-xs text-muted">{user.email}</p></td><td className="px-5 py-4 font-mono text-[10px] text-muted">{user.uid}</td><td className="px-5 py-4"><Badge variant={user.role === 'admin' ? 'warning' : 'neutral'}>{user.role}</Badge></td><td className="px-5 py-4"><Badge variant={statusVariant(user.accountStatus)}>{user.accountStatus}</Badge></td><td className="financial-value px-5 py-4 text-sm">{user.wallet ? formatCurrency(user.wallet.availableBalance, user.wallet.currency) : '—'}</td><td className="financial-value px-5 py-4 text-sm">{user.wallet ? formatCurrency(user.wallet.totalDeposited, user.wallet.currency) : '—'}</td><td className="px-5 py-4 text-xs text-muted">{formatAdminDate(user.createdAt)}</td></tr>)}</tbody>
        </table></div>}
      </Card>
    </div>
  )
}

export default Users
