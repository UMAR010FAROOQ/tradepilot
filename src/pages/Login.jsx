import { useState } from 'react'
import { CircleAlert, LoaderCircle } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/common/Button.jsx'
import Input from '../components/common/Input.jsx'
import useAuth from '../hooks/useAuth.js'
import { getFirebaseErrorMessage } from '../utils/firebaseErrors.js'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { currentUser, loading, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const requestedLocation = location.state?.from
  const redirectTo = requestedLocation?.pathname
    ? `${requestedLocation.pathname}${requestedLocation.search || ''}${requestedLocation.hash || ''}`
    : '/dashboard'

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted">Checking your session…</p>
  }

  if (currentUser) return <Navigate replace to="/dashboard" />

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Enter both your email and password.')
      return
    }

    setIsSubmitting(true)

    try {
      await login(email.trim(), password)
      navigate(redirectTo, { replace: true })
    } catch (firebaseError) {
      setError(getFirebaseErrorMessage(firebaseError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Welcome back</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in to TradePilot</h1>
        <p className="mt-2 text-sm text-muted">Access your secure market workspace.</p>
      </div>

      {error && (
        <div
          className="mb-5 flex gap-2.5 rounded-lg border border-negative/25 bg-negative/10 p-3 text-sm text-negative"
          role="alert"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
        <Input
          autoComplete="email"
          label="Email address"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          type="email"
          value={email}
        />
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Password</span>
            <Link className="text-xs font-medium text-accent hover:text-accent/80" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <Input
            aria-label="Password"
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            type="password"
            value={password}
          />
        </div>
        <Button className="mt-2" disabled={isSubmitting} fullWidth size="lg" type="submit">
          {isSubmitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New to TradePilot?{' '}
        <Link className="font-semibold text-accent hover:text-accent/80" to="/signup">
          Create an account
        </Link>
      </p>
    </div>
  )
}

export default Login
