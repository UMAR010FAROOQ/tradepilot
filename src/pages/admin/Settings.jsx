import { useEffect, useState } from 'react'
import { LoaderCircle, Save, Settings2 } from 'lucide-react'
import Button from '../../components/common/Button.jsx'
import Card from '../../components/common/Card.jsx'
import Modal from '../../components/common/Modal.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import useAuth from '../../hooks/useAuth.js'
import usePlatformSettings from '../../hooks/usePlatformSettings.js'
import { savePlatformSettings } from '../../services/platformSettingsService.js'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'

const controls = [
  ['maintenanceMode', 'Maintenance mode', 'Temporarily replace the user workspace with a maintenance screen. Admin access remains available.'],
  ['allowSignup', 'New registrations', 'Allow visitors to create new user accounts.'],
  ['allowTrading', 'New buy exposure', 'Allow market buys and new limit buy orders. Sells and protective exits remain available.'],
  ['allowDeposits', 'Deposit requests', 'Allow users to submit new manual deposit requests.'],
  ['allowWithdrawals', 'Withdrawal requests', 'Allow users to submit new manual withdrawal requests.'],
]

export default function Settings() {
  const { currentUser } = useAuth()
  const { settings, loading } = usePlatformSettings()
  const [draft, setDraft] = useState(settings)
  const [confirm, setConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(settings), 0)
    return () => window.clearTimeout(timer)
  }, [settings])
  const changed = controls.some(([key]) => draft[key] !== settings[key])
  const save = async () => { setSaving(true); setError(''); try { await savePlatformSettings(currentUser.uid, draft); setMessage('Platform settings updated.'); setConfirm(false) } catch (nextError) { setError(getFirestoreErrorMessage(nextError)) } finally { setSaving(false) } }
  return <div className="space-y-6"><PageHeader eyebrow="Platform control" title="Platform Settings" description="Control user-facing platform availability without changing application code." actions={<Button disabled={!changed || loading} onClick={() => setConfirm(true)}><Save className="size-4" />Save changes</Button>} />
    {message && <div className="rounded-lg border border-positive/25 bg-positive/10 px-4 py-3 text-sm text-positive" role="status">{message}</div>}{error && <div className="rounded-lg border border-negative/25 bg-negative/10 px-4 py-3 text-sm text-negative" role="alert">{error}</div>}
    <Card><div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-accent/10 text-accent"><Settings2 className="size-5" /></span><div><h2 className="text-sm font-semibold">Operational controls</h2><p className="text-xs text-muted">Defaults remain enabled when no settings document exists.</p></div></div><div className="divide-y divide-border">{controls.map(([key, label, description]) => <label className="flex cursor-pointer items-start justify-between gap-5 py-4" key={key}><span><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block max-w-2xl text-xs leading-5 text-muted">{description}</span></span><input aria-label={label} checked={Boolean(draft[key])} className="mt-1 size-5 accent-blue-500" disabled={loading} onChange={(event) => { setMessage(''); setDraft((current) => ({ ...current, [key]: event.target.checked })) }} type="checkbox" /></label>)}</div></Card>
    <Modal isOpen={confirm} onClose={() => !saving && setConfirm(false)} title="Confirm platform changes" description="These controls affect all user accounts immediately." footer={<><Button disabled={saving} onClick={() => setConfirm(false)} variant="ghost">Cancel</Button><Button disabled={saving} onClick={save}>{saving && <LoaderCircle className="size-4 animate-spin" />}{saving ? 'Saving…' : 'Confirm changes'}</Button></>}><p className="text-sm leading-6 text-muted">Review the enabled and disabled states carefully. Existing sell, protection, and cancellation workflows remain available when new buy exposure is disabled.</p></Modal>
  </div>
}
