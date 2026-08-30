import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, CircleAlert, Clock3, LoaderCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import Input from '../components/common/Input.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import Select from '../components/common/Select.jsx'
import Textarea from '../components/common/Textarea.jsx'
import { paymentInstructions } from '../config/paymentInstructions.js'
import { isBankMethod, pakistaniBanks, paymentMethodByValue, paymentMethods } from '../data/paymentMethods.js'
import useAuth from '../hooks/useAuth.js'
import { createDepositRequest } from '../services/depositService.js'
import { getFirestoreErrorMessage } from '../utils/firestoreErrors.js'

const emptyForm = { amount: '', method: '', accountHolderName: '', senderAccount: '', bank: '', customBank: '', reference: '', notes: '' }

function Deposit() {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const method = paymentMethodByValue.get(form.method)
  const instruction = paymentInstructions[form.method]
  const bankName = form.bank === 'Other' ? form.customBank : form.bank
  const update = (field) => (event) => { setForm((current) => ({ ...current, [field]: event.target.value })); setError('') }
  const groups = useMemo(() => [...new Set(paymentMethods.map((item) => item.category))], [])

  const submit = async (event) => {
    event.preventDefault(); setError(''); setIsSubmitting(true)
    try { await createDepositRequest({ ...form, bankName, userId: currentUser.uid }); setIsComplete(true) }
    catch (requestError) { setError(getFirestoreErrorMessage(requestError)) }
    finally { setIsSubmitting(false) }
  }

  if (isComplete) return <div className="space-y-6"><PageHeader eyebrow="Wallet" title="Deposit request" /><Card className="max-w-xl text-center" padding="lg"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-positive/10 text-positive"><CheckCircle2 className="size-6" /></span><h2 className="mt-5 text-lg font-semibold">Request submitted</h2><p className="mt-2 text-sm leading-6 text-muted">Your manual payment request is pending administrator verification. Your balance has not changed.</p><div className="mt-6 flex justify-center gap-2"><Button onClick={() => navigate('/transactions')} variant="secondary">View transactions</Button><Button onClick={() => navigate('/wallet')}>Wallet</Button></div></Card></div>

  return <div className="space-y-6"><PageHeader actions={<Button onClick={() => navigate('/wallet')} variant="ghost"><ArrowLeft className="size-4" />Wallet</Button>} description="Send a manual payment through a supported Pakistani account, then submit its details for review." eyebrow="Wallet" title="Deposit funds" />
    <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"><Card padding="lg">{error && <div className="mb-5 flex gap-2 rounded-lg border border-negative/25 bg-negative/10 p-3 text-sm text-negative" role="alert"><CircleAlert className="size-4" />{error}</div>}<form className="grid gap-5" noValidate onSubmit={submit}>
      <Input inputMode="decimal" label="Amount (USD)" min="0.01" onChange={update('amount')} placeholder="0.00" step="0.01" type="number" value={form.amount} />
      <Select label="Payment method" onChange={update('method')} value={form.method}><option value="">Select a method</option>{groups.map((group) => <optgroup key={group} label={group}>{paymentMethods.filter((item) => item.category === group).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</optgroup>)}</Select>
      {method && <><Input label="Account holder name" onChange={update('accountHolderName')} placeholder="Name on sending account" value={form.accountHolderName} />{isBankMethod(form.method) && <><Select label="Sending bank" onChange={update('bank')} value={form.bank}><option value="">Select a bank</option>{pakistaniBanks.map((bank) => <option key={bank} value={bank}>{bank}</option>)}</Select>{form.bank === 'Other' && <Input label="Bank name" onChange={update('customBank')} value={form.customBank} />}</>}<Input inputMode={method.category === 'Mobile wallet' ? 'tel' : 'text'} label={method.accountLabel} onChange={update('senderAccount')} placeholder={method.placeholder} value={form.senderAccount} /><Input label="Transaction ID / reference" onChange={update('reference')} placeholder="Enter payment reference" value={form.reference} /><Textarea label="Notes (optional)" maxLength="500" onChange={update('notes')} value={form.notes} /></>}
      <Button disabled={isSubmitting} size="lg" type="submit">{isSubmitting && <LoaderCircle className="size-4 animate-spin" />}{isSubmitting ? 'Submitting…' : 'Submit deposit request'}</Button>
    </form></Card><div className="space-y-4"><Card>{instruction ? <><p className="text-xs font-semibold uppercase tracking-wider text-muted">Receiving details</p><p className="mt-3 break-words text-sm font-semibold">{instruction.recipient}</p><p className="mt-3 text-xs leading-5 text-muted">{instruction.note}</p></> : <p className="text-sm text-muted">Select a payment method to view its manual payment instructions.</p>}</Card><Card><Clock3 className="size-4 text-warning" /><h2 className="mt-3 text-sm font-semibold">Manual verification</h2><p className="mt-2 text-xs leading-5 text-muted">Never share a PIN or one-time password. Only an administrator can approve the request after confirming receipt.</p></Card></div></div></div>
}
export default Deposit
