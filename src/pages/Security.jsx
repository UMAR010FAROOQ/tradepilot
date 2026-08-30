import { KeyRound, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import PageHeader from '../components/common/PageHeader.jsx'

function Security() {
  const navigate = useNavigate()
  return <div className="space-y-6"><PageHeader description="Manage the security options currently available for your Firebase account." eyebrow="Account" title="Security" /><div className="grid max-w-3xl gap-4 sm:grid-cols-2"><Card><ShieldCheck className="size-5 text-positive" /><h2 className="mt-4 text-sm font-semibold">Authenticated access</h2><p className="mt-2 text-xs leading-5 text-muted">Protected application routes require a valid signed-in Firebase session.</p></Card><Card><KeyRound className="size-5 text-accent" /><h2 className="mt-4 text-sm font-semibold">Password recovery</h2><p className="mt-2 text-xs leading-5 text-muted">Use the recovery page to request a secure password reset email.</p><Button className="mt-4" onClick={() => navigate('/forgot-password')} size="sm" variant="secondary">Reset password</Button></Card></div></div>
}
export default Security
