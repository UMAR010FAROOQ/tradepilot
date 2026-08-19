import { ShieldCheck } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from '../../hooks/useAuth.js'

function AuthLoadingScreen() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 text-foreground">
      <div className="flex flex-col items-center text-center" role="status">
        <span className="grid size-11 place-items-center rounded-xl bg-accent text-white shadow-panel">
          <ShieldCheck aria-hidden="true" className="size-5" />
        </span>
        <span className="mt-5 size-5 animate-spin rounded-full border-2 border-border border-t-accent" />
        <p className="mt-3 text-sm text-muted">Securing your workspace…</p>
      </div>
    </main>
  )
}

function ProtectedRoute() {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthLoadingScreen />

  if (!currentUser) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}

export default ProtectedRoute
