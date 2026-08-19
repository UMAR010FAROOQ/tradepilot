import { useState } from 'react'
import { ArrowLeft, CheckCircle2, CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import Input from '../components/common/Input.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import Select from '../components/common/Select.jsx'
import useAuth from '../hooks/useAuth.js'
import useWallet from '../hooks/useWallet.js'
import { createWithdrawalRequest } from '../services/withdrawalService.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { getFirestoreErrorMessage } from '../utils/firestoreErrors.js'

function Withdraw() {
  const [form, setForm] = useState({ amount: '', method: '', destination: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const { currentUser } = useAuth()
  const { wallet, loading: walletLoading, error: walletError } = useWallet()
  const navigate = useNavigate()
  const availableBalance = wallet?.availableBalance

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const numericAmount = Number(form.amount)

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (typeof availableBalance !== 'number') {
      setError('Your wallet balance is not available yet.')
      return
    }
    if (numericAmount > availableBalance) {
      setError('The withdrawal amount cannot exceed your available balance.')
      return
    }

    setIsSubmitting(true)

    try {
      await createWithdrawalRequest({
        userId: currentUser.uid,
        amount: numericAmount,
        method: form.method,
        destination: form.destination,
      })
      setIsComplete(true)
    } catch (requestError) {
      setError(getFirestoreErrorMessage(requestError))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isComplete) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Wallet" title="Withdrawal request" />
        <Card className="max-w-xl text-center" padding="lg">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-positive/10 text-positive">
            <CheckCircle2 aria-hidden="true" className="size-6" />
          </span>
          <h2 className="mt-5 text-lg font-semibold">Request submitted</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Your withdrawal is pending review. No wallet balance has been deducted.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button onClick={() => navigate('/transactions')} variant="secondary">
              View transactions
            </Button>
            <Button onClick={() => navigate('/wallet')}>Return to wallet</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Button onClick={() => navigate('/wallet')} variant="ghost">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Wallet
          </Button>
        }
        description="Create a pending withdrawal request without changing your balance."
        eyebrow="Wallet"
        title="Withdraw funds"
      />

      <div className="grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card padding="lg">
          {(error || walletError) && (
            <div className="mb-5 flex gap-2.5 rounded-lg border border-negative/25 bg-negative/10 p-3 text-sm text-negative" role="alert">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p>{error || walletError}</p>
            </div>
          )}
          <form className="grid gap-5" noValidate onSubmit={handleSubmit}>
            <Input
              hint={
                walletLoading
                  ? 'Loading available balance…'
                  : `Available: ${formatCurrency(availableBalance, wallet?.currency || 'USD')}`
              }
              inputMode="decimal"
              label="Amount (USD)"
              min="0.01"
              onChange={updateField('amount')}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={form.amount}
            />
            <Select label="Withdrawal method" onChange={updateField('method')} value={form.method}>
              <option value="">Select a method</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="USDT">USDT</option>
              <option value="BTC">BTC</option>
            </Select>
            <Input
              label="Destination"
              onChange={updateField('destination')}
              placeholder="Bank details or wallet address"
              value={form.destination}
            />
            <Button disabled={isSubmitting || walletLoading || !wallet} size="lg" type="submit">
              {isSubmitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              {isSubmitting ? 'Submitting…' : 'Submit withdrawal request'}
            </Button>
          </form>
        </Card>

        <Card className="h-fit">
          <span className="grid size-9 place-items-center rounded-lg bg-accent/10 text-accent">
            <ShieldCheck aria-hidden="true" className="size-4" />
          </span>
          <h2 className="mt-4 text-sm font-semibold">Balance protected</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Requests remain pending. The frontend cannot deduct funds or approve withdrawals.
          </p>
        </Card>
      </div>
    </div>
  )
}

export default Withdraw
