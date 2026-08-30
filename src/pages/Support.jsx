import { CircleHelp, MessageSquareText } from 'lucide-react'
import Card from '../components/common/Card.jsx'
import PageHeader from '../components/common/PageHeader.jsx'

function Support() {
  return <div className="space-y-6"><PageHeader description="Guidance for account, funding, and simulated trading questions." eyebrow="Account" title="Support" /><div className="grid max-w-3xl gap-4 sm:grid-cols-2"><Card><CircleHelp className="size-5 text-accent" /><h2 className="mt-4 text-sm font-semibold">Before submitting a request</h2><p className="mt-2 text-xs leading-5 text-muted">Include the relevant request or trade ID. Never include a password, PIN, or one-time password.</p></Card><Card><MessageSquareText className="size-5 text-muted" /><h2 className="mt-4 text-sm font-semibold">Contact your administrator</h2><p className="mt-2 text-xs leading-5 text-muted">TradePilot does not have a public support channel configured yet. Contact your workspace administrator through your established channel.</p></Card></div></div>
}
export default Support
