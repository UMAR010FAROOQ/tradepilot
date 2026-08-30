import { useState } from 'react'
import { AtSign, CalendarDays, CheckCircle2, CircleAlert, CircleUserRound, Fingerprint, LoaderCircle, ShieldCheck, UserRound } from 'lucide-react'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import Input from '../components/common/Input.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import useAuth from '../hooks/useAuth.js'
import { getFirestoreErrorMessage } from '../utils/firestoreErrors.js'

function ProfileField({ icon: Icon, label, value, monospace = false }) {
  return <div className="flex min-w-0 items-start gap-3 rounded-lg border border-border bg-elevated/50 p-4"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-muted"><Icon className="size-4" /></span><div className="min-w-0"><p className="text-xs font-medium text-muted">{label}</p><p className={`mt-1 break-all text-sm ${monospace ? 'financial-value text-xs text-muted' : 'text-foreground'}`}>{value || 'Not available'}</p></div></div>
}

function Profile() {
  const { currentUser, userProfile, updateProfileName } = useAuth()
  const [fullName, setFullName] = useState(userProfile?.fullName || '')
  const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('')
  const status = userProfile?.accountStatus || 'active'
  const memberSince = userProfile?.createdAt?.toDate?.() || currentUser?.metadata?.creationTime
  const memberLabel = memberSince ? new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(memberSince)) : 'Not available'
  const save = async (event) => { event.preventDefault(); setError(''); setSuccess(''); if (!fullName.trim()) return setError('Full name is required.'); setSaving(true); try { await updateProfileName(fullName); setSuccess('Profile name updated.') } catch (requestError) { setError(getFirestoreErrorMessage(requestError)) } finally { setSaving(false) } }
  return <div className="space-y-6"><PageHeader description="Manage your display name and review protected account details." eyebrow="Account" title="Profile" />
    <Card className="max-w-3xl" padding="lg"><div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center"><span className="grid size-14 place-items-center rounded-xl bg-accent/15 text-lg font-bold text-accent">{(userProfile?.fullName || currentUser?.email || 'TP').split(/[\s@]+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-semibold">{userProfile?.fullName || 'TradePilot user'}</h2><Badge variant={status === 'active' ? 'positive' : 'warning'}>{status}</Badge></div><p className="mt-1 truncate text-sm text-muted">{currentUser?.email}</p></div></div>
      {error && <div className="mt-5 flex gap-2 rounded-lg border border-negative/25 bg-negative/10 p-3 text-sm text-negative" role="alert"><CircleAlert className="size-4" />{error}</div>}{success && <div className="mt-5 flex gap-2 rounded-lg border border-positive/25 bg-positive/10 p-3 text-sm text-positive" role="status"><CheckCircle2 className="size-4" />{success}</div>}
      <form className="mt-6 flex flex-col items-end gap-3 sm:flex-row" onSubmit={save}><Input className="w-full" label="Full name" maxLength="120" onChange={(event) => { setFullName(event.target.value); setSuccess('') }} value={fullName} /><Button disabled={saving || fullName.trim() === userProfile?.fullName} type="submit">{saving && <LoaderCircle className="size-4 animate-spin" />}{saving ? 'Saving…' : 'Save changes'}</Button></form>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><ProfileField icon={AtSign} label="Email" value={userProfile?.email || currentUser?.email} /><ProfileField icon={ShieldCheck} label="Account role" value={userProfile?.role} /><ProfileField icon={CircleUserRound} label="Account status" value={status} /><ProfileField icon={CalendarDays} label="Member since" value={memberLabel} /><div className="sm:col-span-2"><ProfileField icon={Fingerprint} label="Firebase UID (account identifier)" monospace value={currentUser?.uid} /></div></div><div className="mt-5 flex gap-2 text-xs leading-5 text-muted"><UserRound className="mt-0.5 size-4 shrink-0" /><p>Email, role, account status, and UID are read-only in this application.</p></div>
    </Card></div>
}
export default Profile
