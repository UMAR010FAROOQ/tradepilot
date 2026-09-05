import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle, UserCog } from 'lucide-react'
import Badge from '../../components/common/Badge.jsx'
import Button from '../../components/common/Button.jsx'
import Card from '../../components/common/Card.jsx'
import Modal from '../../components/common/Modal.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import SearchInput from '../../components/common/SearchInput.jsx'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/admin/AdminState.jsx'
import useAuth from '../../hooks/useAuth.js'
import { getUsers, updateUserRole } from '../../services/adminService.js'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { formatAdminDate, statusVariant } from '../../utils/adminFormatters.js'

function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [roleTarget, setRoleTarget] = useState(null)
  const [updatingRole, setUpdatingRole] = useState(false)
  const { currentUser } = useAuth()
  useEffect(() => { getUsers().then(setUsers).catch((requestError) => setError(getFirestoreErrorMessage(requestError))).finally(() => setLoading(false)) }, [])
  const visible = useMemo(() => users.filter((user) => `${user.fullName} ${user.email} ${user.uid}`.toLowerCase().includes(search.toLowerCase())), [users, search])
  const nextRole = roleTarget?.role === 'admin' ? 'user' : 'admin'

  const confirmRoleChange = async () => {
    if (!roleTarget) return
    setUpdatingRole(true)
    setError('')
    setSuccess('')
    try {
      await updateUserRole(roleTarget.uid, nextRole)
      setUsers((items) => items.map((user) => user.uid === roleTarget.uid ? { ...user, role: nextRole } : user))
      setSuccess(`${roleTarget.fullName || roleTarget.email || 'User'} is now ${nextRole === 'admin' ? 'an Admin' : 'a User'}.`)
      setRoleTarget(null)
    } catch (requestError) {
      setError(getFirestoreErrorMessage(requestError))
    } finally {
      setUpdatingRole(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader description="Review account profiles, wallet balances, and role-based access." eyebrow="Administration" title="Users" />
      <AdminError message={error} />
      {success && <div className="rounded-lg border border-positive/25 bg-positive/10 px-4 py-3 text-sm text-positive" role="status">{success}</div>}
      <Card padding="none">
        <div className="border-b border-border p-4"><SearchInput aria-label="Search users" className="max-w-md" onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email or user ID" value={search} /></div>
        {loading ? <AdminLoading /> : visible.length === 0 ? <AdminEmpty title="No users found" /> : <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left">
          <thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-[0.14em] text-muted"><tr><th className="px-5 py-3">User</th><th className="px-5 py-3">UID</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Available</th><th className="px-5 py-3">Deposited</th><th className="px-5 py-3">Created</th><th className="px-5 py-3 text-right">Role action</th></tr></thead>
          <tbody className="divide-y divide-border">{visible.map((user) => { const isCurrentAdmin = user.uid === currentUser.uid; return <tr key={user.uid}><td className="px-5 py-4"><p className="text-sm font-medium">{user.fullName || 'Unnamed user'}</p><p className="mt-0.5 text-xs text-muted">{user.email}</p></td><td className="px-5 py-4 font-mono text-[10px] text-muted">{user.uid}</td><td className="px-5 py-4"><Badge variant={user.role === 'admin' ? 'warning' : 'neutral'}>{user.role === 'admin' ? 'Admin' : 'User'}</Badge></td><td className="px-5 py-4"><Badge variant={statusVariant(user.accountStatus)}>{user.accountStatus}</Badge></td><td className="financial-value px-5 py-4 text-sm">{user.wallet ? formatCurrency(user.wallet.availableBalance, user.wallet.currency) : '—'}</td><td className="financial-value px-5 py-4 text-sm">{user.wallet ? formatCurrency(user.wallet.totalDeposited, user.wallet.currency) : '—'}</td><td className="px-5 py-4 text-xs text-muted">{formatAdminDate(user.createdAt)}</td><td className="px-5 py-4 text-right">{isCurrentAdmin ? <span className="text-xs text-muted">You cannot change your own role.</span> : <Button onClick={() => { setError(''); setSuccess(''); setRoleTarget(user) }} size="sm" variant="secondary"><UserCog aria-hidden="true" className="size-4" />Change role</Button>}</td></tr> })}</tbody>
        </table></div>}
      </Card>
      <Modal
        description={roleTarget ? `Change this account from ${roleTarget.role === 'admin' ? 'Admin' : 'User'} to ${nextRole === 'admin' ? 'Admin' : 'User'}?` : ''}
        footer={<><Button disabled={updatingRole} onClick={() => setRoleTarget(null)} variant="ghost">Cancel</Button><Button disabled={updatingRole} onClick={confirmRoleChange} variant={nextRole === 'admin' ? 'primary' : 'danger'}>{updatingRole && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}{updatingRole ? 'Changing role…' : `Change to ${nextRole === 'admin' ? 'Admin' : 'User'}`}</Button></>}
        isOpen={Boolean(roleTarget)}
        onClose={() => { if (!updatingRole) setRoleTarget(null) }}
        title="Confirm role change"
      >
        <p className="text-sm leading-6 text-muted">This change takes effect through the user’s live profile. Promoted users gain administrator access; demoted users lose it.</p>
      </Modal>
    </div>
  )
}

export default Users
