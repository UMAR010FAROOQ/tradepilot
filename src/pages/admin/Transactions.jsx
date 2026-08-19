import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import Badge from '../../components/common/Badge.jsx'
import Card from '../../components/common/Card.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/admin/AdminState.jsx'
import { getTransactions, getUsers } from '../../services/adminService.js'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { formatAdminDate, statusVariant } from '../../utils/adminFormatters.js'

function Transactions() {
  const [items, setItems] = useState([])
  const [users, setUsers] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => { Promise.all([getTransactions(), getUsers()]).then(([transactions, accounts]) => { setItems(transactions); setUsers(new Map(accounts.map((user) => [user.uid, user]))) }).catch((requestError) => setError(getFirestoreErrorMessage(requestError))).finally(() => setLoading(false)) }, [])
  const visible = useMemo(() => items.filter((item) => { const user = users.get(item.userId); return `${item.type} ${item.referenceId} ${user?.fullName || ''} ${user?.email || ''} ${item.userId}`.toLowerCase().includes(search.toLowerCase()) }), [items, search, users])
  return (
    <div className="space-y-6">
      <PageHeader description="Audit entries created when administrators approve requests." eyebrow="Ledger" title="Transactions" />
      <AdminError message={error} />
      <Card padding="none">
        <div className="border-b border-border p-4"><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input aria-label="Search transactions" className="h-10 w-full rounded-lg border border-border bg-elevated pl-9 pr-3 text-sm outline-none focus:border-accent" onChange={(event) => setSearch(event.target.value)} placeholder="Search user, type or reference" value={search} /></div></div>
        {loading ? <AdminLoading /> : visible.length === 0 ? <AdminEmpty title="No ledger entries found" /> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left">
          <thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-[0.14em] text-muted"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Currency</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Created</th></tr></thead>
          <tbody className="divide-y divide-border">{visible.map((item) => { const user = users.get(item.userId); return <tr key={item.id}><td className="px-5 py-4"><p className="text-sm font-medium">{user?.fullName || 'Unknown user'}</p><p className="text-xs text-muted">{user?.email || 'No email'}</p><p className="font-mono text-[10px] text-muted/70">{item.userId}</p></td><td className="px-5 py-4 text-sm capitalize">{item.type}</td><td className="financial-value px-5 py-4 text-sm font-semibold">{formatCurrency(item.amount, item.currency)}</td><td className="px-5 py-4 text-xs text-muted">{item.currency}</td><td className="px-5 py-4"><Badge variant={statusVariant(item.status)}>{item.status}</Badge></td><td className="px-5 py-4 font-mono text-xs text-muted">{item.referenceId}</td><td className="px-5 py-4 text-xs text-muted">{formatAdminDate(item.createdAt)}</td></tr> })}</tbody>
        </table></div>}
      </Card>
    </div>
  )
}

export default Transactions
