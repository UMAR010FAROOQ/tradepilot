import { useState } from 'react'
import { ArrowLeft, CheckCircle2, CircleAlert, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/common/Button.jsx'
import Input from '../components/common/Input.jsx'
import useAuth from '../hooks/useAuth.js'
import { getFirebaseErrorMessage } from '../utils/firebaseErrors.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const { resetPassword } = useAuth()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!emailPattern.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }

    setIsSubmitting(true)

    try {
      await resetPassword(email.trim())
      setIsComplete(true)
    } catch (firebaseError) {
      if (firebaseError?.code === 'auth/user-not-found') setIsComplete(true)
      else setError(getFirebaseErrorMessage(firebaseError))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isComplete) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-positive/10 text-positive">
          <CheckCircle2 aria-hidden="true" className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          If an account matches that email, Firebase will send password reset instructions shortly.
        </p>
        <Link
          className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80"
          to="/login"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Return to sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link
        className="mb-7 inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-foreground"
        to="/login"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to sign in
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Enter your email and we’ll request a secure reset link.
      </p>

      {error && (
        <div
          className="mt-5 flex gap-2.5 rounded-lg border border-negative/25 bg-negative/10 p-3 text-sm text-negative"
          role="alert"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form className="mt-6 grid gap-4" noValidate onSubmit={handleSubmit}>
        <Input
          autoComplete="email"
          label="Email address"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          type="email"
          value={email}
        />
        <Button disabled={isSubmitting} fullWidth size="lg" type="submit">
          {isSubmitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {isSubmitting ? 'Sending request…' : 'Send reset link'}
        </Button>
      </form>
    </div>
  )
}

export default ForgotPassword
