import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, RefreshCw, X } from 'lucide-react'
import Badge from '../common/Badge.jsx'
import Button from '../common/Button.jsx'
import Card from '../common/Card.jsx'
import Input from '../common/Input.jsx'
import Modal from '../common/Modal.jsx'
import PageHeader from '../common/PageHeader.jsx'
import Select from '../common/Select.jsx'
import SearchInput from '../common/SearchInput.jsx'
import { AdminEmpty, AdminError, AdminLoading } from './AdminState.jsx'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import { formatAdminDate, statusVariant } from '../../utils/adminFormatters.js'
import { requestAccount } from '../../utils/paymentDetails.js'

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
    const text = `${item.userId} ${item.reference || ''} ${requestAccount(item)} ${item.method || ''} ${item.accountHolderName || ''} ${item.bankName || ''}`.toLowerCase()
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
          <SearchInput aria-label={`Search ${plural.toLowerCase()}`} onChange={(event) => setSearch(event.target.value)} placeholder="Search method, reference or destination" value={search} />
          <Select aria-label="Filter status" onChange={(event) => setStatus(event.target.value)} value={status}>
            <option value="all">All statuses</option><option value="pending">Pending</option>
            <option value="approved">Approved</option><option value="rejected">Rejected</option>
          </Select>
        </div>
        {loading ? <AdminLoading /> : visible.length === 0 ? <AdminEmpty title={`No ${plural.toLowerCase()} found`} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-[0.14em] text-muted">
                <tr><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Account details</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Created</th><th className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((item) => (
                  <tr key={item.id}>
                    <td className="financial-value px-5 py-4 text-sm font-semibold">{formatCurrency(item.amount, item.currency)}</td>
                    <td className="px-5 py-4 text-sm"><p>{item.method}</p><p className="mt-0.5 text-xs text-muted">{item.paymentCategory || 'Legacy method'}</p></td>
                    <td className="max-w-56 px-5 py-4 text-xs"><p>{item.accountHolderName || 'Legacy request'}</p><p className="mt-1 text-muted">{item.bankName ? `${item.bankName} · ` : ''}{requestAccount(item) || '—'}</p></td>
                    <td className="max-w-40 truncate px-5 py-4 text-xs text-muted" title={item.reference}>{item.reference || '—'}</td>
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
        {dialog?.action === 'approve' ? <div className="space-y-3"><p className="text-sm font-semibold text-warning">Confirm the payment outside TradePilot before approving.</p><p className="text-sm text-muted">Approval updates the wallet and creates a completed audit transaction atomically. TradePilot does not verify manual payments automatically.</p></div> : <Input autoFocus label="Rejection reason" onChange={(event) => setReason(event.target.value)} placeholder="Explain why this request was rejected" value={reason} />}
      </Modal>
    </div>
  )
}

export default AdminRequestPage
