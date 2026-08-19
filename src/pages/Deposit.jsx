import { useState } from 'react'
import { ArrowLeft, CheckCircle2, CircleAlert, Clock3, LoaderCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import Input from '../components/common/Input.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import Select from '../components/common/Select.jsx'
import useAuth from '../hooks/useAuth.js'
import { createDepositRequest } from '../services/depositService.js'
import { getFirestoreErrorMessage } from '../utils/firestoreErrors.js'

function Deposit() {
  const [form, setForm] = useState({ amount: '', method: '', reference: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.reference.trim()) {
      setError('Enter a reference or transaction ID.')
      return
    }

    setIsSubmitting(true)

    try {
      await createDepositRequest({
        userId: currentUser.uid,
        amount: form.amount,
        method: form.method,
        reference: form.reference,
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
        <PageHeader eyebrow="Wallet" title="Deposit request" />
        <Card className="max-w-xl text-center" padding="lg">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-positive/10 text-positive">
            <CheckCircle2 aria-hidden="true" className="size-6" />
          </span>
          <h2 className="mt-5 text-lg font-semibold">Request submitted</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Your deposit is pending review. Your wallet balance will not change until a future secure approval process completes.
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
        description="Submit a deposit for review. No balance is added at this stage."
        eyebrow="Wallet"
        title="Deposit funds"
      />

      <div className="grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <Card padding="lg">
          {error && (
            <div className="mb-5 flex gap-2.5 rounded-lg border border-negative/25 bg-negative/10 p-3 text-sm text-negative" role="alert">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <form className="grid gap-5" noValidate onSubmit={handleSubmit}>
            <Input
              inputMode="decimal"
              label="Amount (USD)"
              min="0.01"
              onChange={updateField('amount')}
              placeholder="0.00"
              step="0.01"
              type="number"
              value={form.amount}
            />
            <Select label="Deposit method" onChange={updateField('method')} value={form.method}>
              <option value="">Select a method</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="USDT">USDT</option>
              <option value="BTC">BTC</option>
            </Select>
            <Input
              label="Reference / Transaction ID"
              onChange={updateField('reference')}
              placeholder="Enter payment reference"
              value={form.reference}
            />
            <Button disabled={isSubmitting} size="lg" type="submit">
              {isSubmitting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              {isSubmitting ? 'Submitting…' : 'Submit deposit request'}
            </Button>
          </form>
        </Card>

        <Card className="h-fit">
          <span className="grid size-9 place-items-center rounded-lg bg-warning/10 text-warning">
            <Clock3 aria-hidden="true" className="size-4" />
          </span>
          <h2 className="mt-4 text-sm font-semibold">Pending review</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            This creates a request record only. It cannot approve itself or update your wallet.
          </p>
        </Card>
      </div>
    </div>
  )
}

export default Deposit
