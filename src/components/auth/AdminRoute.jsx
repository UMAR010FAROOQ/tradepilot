import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'

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
  if (userProfile?.role !== 'admin') return <Navigate replace to="/dashboard" />
  return <Outlet />
}

export default AdminRoute
