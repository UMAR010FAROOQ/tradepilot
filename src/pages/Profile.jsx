import { AtSign, CircleUserRound, Fingerprint, ShieldCheck, UserRound } from 'lucide-react'
import Badge from '../components/common/Badge.jsx'
import Card from '../components/common/Card.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import useAuth from '../hooks/useAuth.js'

function ProfileField({ icon: Icon, label, value, monospace = false }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-border bg-elevated/50 p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-muted">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className={`mt-1 break-all text-sm text-foreground ${monospace ? 'financial-value' : ''}`}>
          {value || 'Not available'}
        </p>
      </div>
    </div>
  )
}

function Profile() {
  const { currentUser, userProfile } = useAuth()
  const status = userProfile?.accountStatus || 'active'

  return (
    <div className="space-y-6">
      <PageHeader
        description="Read-only Firebase account information for this phase."
        eyebrow="Account"
        title="Profile"
      />

      <Card className="max-w-3xl" padding="lg">
        <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center">
          <span className="grid size-14 place-items-center rounded-xl bg-accent/15 text-lg font-bold text-accent">
            {(userProfile?.fullName || currentUser?.email || 'TP')
              .split(/[\s@]+/)
              .slice(0, 2)
              .map((part) => part.charAt(0))
              .join('')
              .toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold">
                {userProfile?.fullName || 'TradePilot user'}
              </h2>
              <Badge variant={status === 'active' ? 'positive' : 'warning'}>{status}</Badge>
            </div>
            <p className="mt-1 truncate text-sm text-muted">{currentUser?.email}</p>
          </div>
        </div>

        {userProfile?.profileMissing && (
          <div className="mt-5 rounded-lg border border-warning/25 bg-warning/10 p-3 text-sm text-warning">
            Your authentication account is active, but its Firestore profile document is not available yet.
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <ProfileField icon={UserRound} label="Full name" value={userProfile?.fullName} />
          <ProfileField icon={AtSign} label="Email" value={userProfile?.email || currentUser?.email} />
          <ProfileField icon={ShieldCheck} label="Role" value={userProfile?.role} />
          <ProfileField icon={CircleUserRound} label="Account status" value={status} />
          <div className="sm:col-span-2">
            <ProfileField icon={Fingerprint} label="Firebase UID" monospace value={currentUser?.uid} />
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Profile
