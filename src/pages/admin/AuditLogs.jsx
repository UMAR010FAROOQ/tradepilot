import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import Badge from '../../components/common/Badge.jsx'
import Button from '../../components/common/Button.jsx'
import Card from '../../components/common/Card.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import SearchInput from '../../components/common/SearchInput.jsx'
import Select from '../../components/common/Select.jsx'
import { AdminEmpty, AdminError, AdminLoading } from '../../components/admin/AdminState.jsx'
import { getAuditLogs } from '../../services/adminService.js'
import { formatAdminDate } from '../../utils/adminFormatters.js'
import { downloadCsv } from '../../utils/csv.js'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'

const FILTER_NOW = Date.now()

export default function AuditLogs() {
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [search, setSearch] = useState(''), [action, setAction] = useState('all'), [resource, setResource] = useState('all'), [date, setDate] = useState('all')
  useEffect(() => { getAuditLogs().then(setItems).catch((e) => setError(getFirestoreErrorMessage(e))).finally(() => setLoading(false)) }, [])
  const actions = [...new Set(items.map((item) => item.action))]
  const visible = useMemo(() => {
    const cutoff = date === '7' ? FILTER_NOW - 7 * 86400000 : date === '30' ? FILTER_NOW - 30 * 86400000 : 0
    return items.filter((item) => (action === 'all' || item.action === action) && (resource === 'all' || item.resourceType === resource) && (!cutoff || (item.createdAt?.toMillis?.() || 0) >= cutoff) && `${item.actorUserId} ${item.targetUserId} ${item.resourceId}`.toLowerCase().includes(search.toLowerCase()))
  }, [items, search, action, resource, date])
  const exportRows = () => downloadCsv(`tradepilot-audit-${new Date().toISOString().slice(0, 10)}.csv`, ['Action', 'Actor', 'Target', 'Resource type', 'Resource ID', 'Created'], visible.map((item) => [item.action, item.actorUserId, item.targetUserId, item.resourceType, item.resourceId, item.createdAt?.toDate?.()?.toISOString?.() || '']))
  return <div className="space-y-6"><PageHeader eyebrow="Security" title="Audit Logs" description="Append-only records of sensitive administrative actions." actions={<Button disabled={!visible.length} onClick={exportRows} variant="secondary"><Download className="size-4" />Export CSV</Button>} /><AdminError message={error} /><Card padding="none"><div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 xl:grid-cols-[1fr_220px_180px_160px]"><SearchInput aria-label="Search audit logs" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actor, target or resource ID" /><Select aria-label="Filter action" value={action} onChange={(e) => setAction(e.target.value)}><option value="all">All actions</option>{actions.map((value) => <option value={value} key={value}>{value.replaceAll('_', ' ')}</option>)}</Select><Select aria-label="Filter resource type" value={resource} onChange={(e) => setResource(e.target.value)}><option value="all">All resources</option><option value="user">Users</option><option value="deposit">Deposits</option><option value="withdrawal">Withdrawals</option></Select><Select aria-label="Filter date" value={date} onChange={(e) => setDate(e.target.value)}><option value="all">All dates</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></Select></div>{loading ? <AdminLoading /> : !visible.length ? <AdminEmpty title="No audit records found" /> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-wider text-muted"><tr>{['Action', 'Target', 'Resource', 'Actor', 'Date', 'Details'].map((heading) => <th className="px-5 py-3" key={heading}>{heading}</th>)}</tr></thead><tbody className="divide-y divide-border">{visible.map((item) => <tr key={item.id}><td className="px-5 py-4"><Badge variant="neutral">{item.action.replaceAll('_', ' ')}</Badge></td><td className="max-w-40 truncate px-5 py-4 font-mono text-xs text-muted" title={item.targetUserId}>{item.targetUserId || '—'}</td><td className="px-5 py-4 text-xs">{item.resourceType}<span className="mt-1 block max-w-40 truncate font-mono text-muted" title={item.resourceId}>{item.resourceId}</span></td><td className="max-w-40 truncate px-5 py-4 font-mono text-xs text-muted" title={item.actorUserId}>{item.actorUserId}</td><td className="px-5 py-4 text-xs text-muted">{formatAdminDate(item.createdAt)}</td><td className="px-5 py-4 text-xs text-muted">{item.metadata?.from && item.metadata?.to ? `${item.metadata.from} → ${item.metadata.to}` : '—'}</td></tr>)}</tbody></table></div>}</Card></div>
}
