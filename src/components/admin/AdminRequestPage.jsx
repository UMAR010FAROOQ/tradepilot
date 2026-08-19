import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, RefreshCw, Search, X } from 'lucide-react'
import Badge from '../common/Badge.jsx'
import Button from '../common/Button.jsx'
import Card from '../common/Card.jsx'
import Input from '../common/Input.jsx'
import Modal from '../common/Modal.jsx'
import PageHeader from '../common/PageHeader.jsx'
import Select from '../common/Select.jsx'
import { AdminEmpty, AdminError, AdminLoading } from './AdminState.jsx'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { formatAdminDate, statusVariant } from '../../utils/adminFormatters.js'

function AdminRequestPage({ type, loadRequests, approveRequest, rejectRequest }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [dialog, setDialog] = useState(null)
  const [reason, setReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setItems(await loadRequests()) }
    catch (requestError) { setError(getFirestoreErrorMessage(requestError)) }
    finally { setLoading(false) }
  }, [loadRequests])

  useEffect(() => {
    let active = true
    loadRequests().then((requests) => active && setItems(requests))
      .catch((requestError) => active && setError(getFirestoreErrorMessage(requestError)))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [loadRequests])

  const visible = useMemo(() => items.filter((item) => {
    const text = `${item.userId} ${item.reference || ''} ${item.destination || ''} ${item.method || ''}`.toLowerCase()
    return (status === 'all' || item.status === status) && text.includes(search.toLowerCase())
  }), [items, search, status])

  const act = async () => {
    setProcessing(true)
    setError('')
    try {
      if (dialog.action === 'approve') await approveRequest(dialog.item.id)
      else await rejectRequest(dialog.item.id, reason)
      setDialog(null)
      setReason('')
      await load()
    } catch (requestError) { setError(getFirestoreErrorMessage(requestError)) }
    finally { setProcessing(false) }
  }

  const plural = type === 'deposit' ? 'Deposits' : 'Withdrawals'
  return (
    <div className="space-y-6">
      <PageHeader
        actions={<Button onClick={load} variant="secondary"><RefreshCw className="size-4" />Refresh</Button>}
        description={`Review and process ${type} requests. Approvals update the wallet and audit record atomically.`}
        eyebrow="Operations"
        title={plural}
      />
      <AdminError message={error} />
      <Card padding="none">
        <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input aria-label={`Search ${plural.toLowerCase()}`} className="h-10 w-full rounded-lg border border-border bg-elevated pl-9 pr-3 text-sm outline-none focus:border-accent" onChange={(event) => setSearch(event.target.value)} placeholder="Search user, method or reference" value={search} />
          </div>
          <Select aria-label="Filter status" onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="all">All statuses</option><option value="pending">Pending</option>
            <option value="approved">Approved</option><option value="rejected">Rejected</option>
          </Select>
        </div>
        {loading ? <AdminLoading /> : visible.length === 0 ? <AdminEmpty title={`No ${plural.toLowerCase()} found`} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-[0.14em] text-muted">
                <tr><th className="px-5 py-3">User</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Reference / destination</th>{type === 'withdrawal' && <th className="px-5 py-3">Available balance</th>}<th className="px-5 py-3">Status</th><th className="px-5 py-3">Created</th><th className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4 font-mono text-xs text-muted">{item.userId}</td>
                    <td className="financial-value px-5 py-4 text-sm font-semibold">{formatCurrency(item.amount, item.currency)}</td>
                    <td className="px-5 py-4 text-sm">{item.method}</td>
                    <td className="max-w-48 truncate px-5 py-4 text-xs text-muted" title={item.reference || item.destination}>{item.reference || item.destination}</td>
                    {type === 'withdrawal' && <td className="financial-value px-5 py-4 text-sm">{item.availableBalance === null ? '—' : formatCurrency(item.availableBalance, item.currency)}</td>}
                    <td className="px-5 py-4"><Badge variant={statusVariant(item.status)}>{item.status}</Badge></td>
                    <td className="px-5 py-4 text-xs text-muted">{formatAdminDate(item.createdAt)}</td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-2">{item.status === 'pending' ? <><Button onClick={() => setDialog({ action: 'approve', item })} size="sm" variant="success"><Check className="size-3.5" />Approve</Button><Button onClick={() => setDialog({ action: 'reject', item })} size="sm" variant="danger"><X className="size-3.5" />Reject</Button></> : <span className="text-xs text-muted">Processed</span>}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Modal
        description={dialog ? `${formatCurrency(dialog.item.amount, dialog.item.currency)} · ${dialog.item.method}` : ''}
        footer={<><Button disabled={processing} onClick={() => setDialog(null)} variant="ghost">Cancel</Button><Button disabled={processing} onClick={act} variant={dialog?.action === 'approve' ? 'success' : 'danger'}>{processing ? 'Processing…' : dialog?.action === 'approve' ? 'Confirm approval' : 'Confirm rejection'}</Button></>}
        isOpen={Boolean(dialog)}
        onClose={() => !processing && setDialog(null)}
        title={`${dialog?.action === 'approve' ? 'Approve' : 'Reject'} ${type}`}
      >
        {dialog?.action === 'approve' ? <p className="text-sm text-muted">This updates the wallet and creates a completed audit transaction in one atomic operation.</p> : <Input autoFocus label="Rejection reason" onChange={(event) => setReason(event.target.value)} placeholder="Explain why this request was rejected" value={reason} />}
      </Modal>
    </div>
  )
}

export default AdminRequestPage
