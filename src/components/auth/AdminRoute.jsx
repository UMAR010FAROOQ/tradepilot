import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'
import AccountRestricted from './AccountRestricted.jsx'
import { needsEmailVerification } from '../../utils/emailVerification.js'

function AdminRoute() {
  const { currentUser, userProfile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas text-sm text-muted" role="status">
        Verifying administrator access…
      </div>
    )
  }

  if (!currentUser) return <Navigate replace state={{ from: location }} to="/login" />
  if (needsEmailVerification(currentUser)) return <Navigate replace state={{ email: currentUser.email || '', from: location }} to="/verify-email" />
  if (userProfile?.accountStatus && userProfile.accountStatus !== 'active') return <AccountRestricted status={userProfile.accountStatus} />
  if (userProfile?.role !== 'admin') return <Navigate replace to="/dashboard" />
  return <Outlet />
}

export default AdminRoute
