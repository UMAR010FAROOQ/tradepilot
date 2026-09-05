import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, LoaderCircle, MailCheck } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/common/Button.jsx'
import Input from '../components/common/Input.jsx'
import useAuth from '../hooks/useAuth.js'
import { needsEmailVerification } from '../utils/emailVerification.js'
import { getFirebaseErrorMessage } from '../utils/firebaseErrors.js'

const RESEND_COOLDOWN_SECONDS = 60

function VerifyEmail() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, loading, logout, refreshEmailVerification, resendVerification } = useAuth()
  const [email, setEmail] = useState(location.state?.email || currentUser?.email || '')
  const [password, setPassword] = useState('')
  const [processing, setProcessing] = useState(false)
  const [checking, setChecking] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [sent, setSent] = useState(Boolean(location.state?.verificationSent))
  const [error, setError] = useState(() => location.state?.verificationErrorCode ? getFirebaseErrorMessage({ code: location.state.verificationErrorCode }) : '')

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = window.setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  if (loading) return <p className="py-10 text-center text-sm text-muted">Checking your session…</p>
  if (currentUser && !needsEmailVerification(currentUser)) return <Navigate replace to="/dashboard" />

  const handleResend = async (event) => {
    event.preventDefault()
    setError('')
    setSent(false)
    if (!currentUser && (!email.trim() || !password)) {
      setError('Enter your email and password to resend the verification link.')
      return
    }
    setProcessing(true)
    try {
      const result = await resendVerification(email.trim(), password)
      setPassword('')
      if (result.alreadyVerified) {
        setError('This email is already verified. Return to login to continue.')
      } else {
        setSent(true)
        setCooldown(RESEND_COOLDOWN_SECONDS)
      }
    } catch (requestError) {
      setError(getFirebaseErrorMessage(requestError))
    } finally {
      setProcessing(false)
    }
  }

  const checkVerification = async () => {
    setError('')
    if (!currentUser) {
      navigate('/login', { replace: true })
      return
    }
    setChecking(true)
    try {
      const verified = await refreshEmailVerification()
      if (verified) {
        const requested = location.state?.from
        const returnTo = location.state?.returnTo || (requested?.pathname ? `${requested.pathname}${requested.search || ''}${requested.hash || ''}` : '/dashboard')
        navigate(returnTo, { replace: true })
      } else {
        setError('Your email is not verified yet. Open the verification link, then check again.')
      }
    } catch (requestError) {
      setError(getFirebaseErrorMessage(requestError))
    } finally {
      setChecking(false)
    }
  }

  const backToLogin = async () => {
    setError('')
    try {
      if (currentUser) await logout()
      navigate('/login', { replace: true })
    } catch (requestError) {
      setError(getFirebaseErrorMessage(requestError))
    }
  }

  return (
    <div>
      <span className="grid size-12 place-items-center rounded-xl bg-accent/12 text-accent"><MailCheck aria-hidden="true" className="size-6" /></span>
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Account security</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Verify your email</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{sent ? 'We sent a verification link to your email address. Open the link, then return to TradePilot and sign in.' : 'Verify your email address before entering the TradePilot workspace.'}</p>
        {email && <p className="mt-2 break-all text-sm font-semibold text-foreground">{email}</p>}
      </div>

      {sent && <div className="mt-5 flex gap-2.5 rounded-lg border border-positive/25 bg-positive/10 p-3 text-sm text-positive" role="status"><CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><p>Verification email sent. Check your inbox and spam folder.</p></div>}
      {error && <div className="mt-5 flex gap-2.5 rounded-lg border border-negative/25 bg-negative/10 p-3 text-sm text-negative" role="alert"><CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><p>{error}</p></div>}

      <form className="mt-6 grid gap-4" noValidate onSubmit={handleResend}>
        {!currentUser && <><Input autoComplete="email" label="Email address" onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" type="email" value={email} /><Input autoComplete="current-password" label="Password" onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password to resend" type="password" value={password} /></>}
        <Button disabled={processing || cooldown > 0} fullWidth type="submit" variant="secondary">{processing && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}{processing ? 'Sending…' : cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend verification email'}</Button>
      </form>

      {currentUser && <Button className="mt-3" disabled={checking} fullWidth onClick={checkVerification}>{checking && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}{checking ? 'Checking…' : 'I have verified my email'}</Button>}
      <Button className="mt-3" disabled={processing || checking} fullWidth onClick={backToLogin} variant="ghost">Back to Login</Button>
      <p className="mt-5 text-center text-xs leading-5 text-muted">For security, TradePilot never asks for an email verification code.</p>
    </div>
  )
}

export default VerifyEmail
