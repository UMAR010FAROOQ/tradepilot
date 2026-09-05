import { useState } from 'react'
import { CircleAlert, LoaderCircle } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Button from '../components/common/Button.jsx'
import Input from '../components/common/Input.jsx'
import useAuth from '../hooks/useAuth.js'
import { getFirebaseErrorMessage } from '../utils/firebaseErrors.js'
import { getFirestoreErrorMessage } from '../utils/firestoreErrors.js'
import { needsEmailVerification } from '../utils/emailVerification.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(form) {
  const errors = {}

  if (!form.fullName.trim()) errors.fullName = 'Enter your full name.'
  if (!form.email.trim()) errors.email = 'Enter your email address.'
  else if (!emailPattern.test(form.email)) errors.email = 'Enter a valid email address.'
  if (!form.password) errors.password = 'Create a password.'
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.'
  if (!form.confirmPassword) errors.confirmPassword = 'Confirm your password.'
  else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.'

  return errors
}

function Signup() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [needsRecovery, setNeedsRecovery] = useState(false)
  const { currentUser, loading, signup, initializeAccount, completeSignupVerification } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted">Checking your session…</p>
  }

  if (currentUser && !error && !isSubmitting) return <Navigate replace to={needsEmailVerification(currentUser) ? '/verify-email' : '/dashboard'} />

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const validationErrors = validateForm(form)
    setFieldErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setIsSubmitting(true)

    try {
      const result = await signup(form.email.trim(), form.password, form.fullName)
      navigate('/verify-email', { replace: true, state: { email: form.email.trim(), verificationSent: result.verificationSent, verificationErrorCode: result.verificationError?.code || '' } })
    } catch (firebaseError) {
      setNeedsRecovery(firebaseError?.code === 'account/initialization-failed')
      setError(
        firebaseError?.code?.startsWith('auth/')
          ? getFirebaseErrorMessage(firebaseError)
          : getFirestoreErrorMessage(firebaseError),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRecovery = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      await initializeAccount(form.fullName)
      const result = await completeSignupVerification()
      navigate('/verify-email', { replace: true, state: { email: form.email.trim(), verificationSent: result.verificationSent, verificationErrorCode: result.verificationError?.code || '' } })
    } catch (setupError) {
      setError(getFirestoreErrorMessage(setupError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Get started</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-muted">Set up secure access to your TradePilot workspace.</p>
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

      {needsRecovery && currentUser && (
        <div className="mb-5 rounded-lg border border-warning/25 bg-warning/10 p-4">
          <p className="text-sm text-warning">
            Your login was created. Retry the Firestore profile and wallet setup without creating another account.
          </p>
          <Button
            className="mt-3"
            disabled={isSubmitting}
            onClick={handleRecovery}
            size="sm"
            variant="secondary"
          >
            {isSubmitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            Retry account setup
          </Button>
        </div>
      )}

      <form className="grid gap-4" hidden={needsRecovery && Boolean(currentUser)} noValidate onSubmit={handleSubmit}>
        <Input
          autoComplete="name"
          error={fieldErrors.fullName}
          label="Full name"
          onChange={updateField('fullName')}
          placeholder="Your full name"
          value={form.fullName}
        />
        <Input
          autoComplete="email"
          error={fieldErrors.email}
          label="Email address"
          onChange={updateField('email')}
          placeholder="name@example.com"
          type="email"
          value={form.email}
        />
        <Input
          autoComplete="new-password"
          error={fieldErrors.password}
          hint="Use at least 8 characters."
          label="Password"
          onChange={updateField('password')}
          placeholder="Create a password"
          type="password"
          value={form.password}
        />
        <Input
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
          label="Confirm password"
          onChange={updateField('confirmPassword')}
          placeholder="Repeat your password"
          type="password"
          value={form.confirmPassword}
        />
        <Button className="mt-2" disabled={isSubmitting} fullWidth size="lg" type="submit">
          {isSubmitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link className="font-semibold text-accent hover:text-accent/80" to="/login">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default Signup
