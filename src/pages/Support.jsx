import { Banknote, CircleHelp, Mail, MessageSquareText, TrendingUp } from 'lucide-react'
import Card from '../components/common/Card.jsx'
import PageHeader from '../components/common/PageHeader.jsx'

const faqs = [
  ['How are deposits verified?', 'Deposits are manual requests. An administrator confirms the external payment before approving the wallet credit.'],
  ['How do withdrawals work?', 'A request remains pending until an administrator verifies the destination and approves it. The wallet changes only on approval.'],
  ['Why do Forex prices refresh slower than Crypto?', 'Crypto uses a shared live Binance stream. Forex and Gold use rate-limited polling through the configured Twelve Data proxy.'],
  ['What does simulated trading mean?', 'Orders change only your TradePilot practice wallet and positions. They never reach Binance, a broker, or a real exchange.'],
  ['Why might a Forex or Gold market be closed?', 'These markets follow weekday sessions and scheduled market closures, unlike 24/7 Crypto markets.'],
  ['How do I close an active trade?', 'Open Active Trades, choose Close, select 25%, 50%, 75%, or 100%, and confirm after the fresh quote is shown.'],
  ['Why is my payment still pending?', 'Manual requests remain pending until an administrator verifies the external payment details.'],
]

function Support() {
  const email = (import.meta.env.VITE_SUPPORT_EMAIL || '').trim()
  return <div className="space-y-6"><PageHeader description="Practical guidance for accounts, manual payments, market data, and simulated trading." eyebrow="Account" title="Support" /><div className="grid gap-4 sm:grid-cols-3"><Card><CircleHelp className="size-5 text-accent" /><h2 className="mt-4 text-sm font-semibold">Help center</h2><p className="mt-2 text-xs leading-5 text-muted">Review common account and product questions below.</p></Card><Card><Banknote className="size-5 text-warning" /><h2 className="mt-4 text-sm font-semibold">Account & payments</h2><p className="mt-2 text-xs leading-5 text-muted">Manual funding is reviewed by an authorized administrator.</p></Card><Card><TrendingUp className="size-5 text-positive" /><h2 className="mt-4 text-sm font-semibold">Trading & markets</h2><p className="mt-2 text-xs leading-5 text-muted">All TradePilot execution is simulated and long-only.</p></Card></div>
    <Card className="max-w-4xl" padding="none"><div className="border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Frequently asked questions</h2></div><div className="divide-y divide-border">{faqs.map(([question, answer]) => <details className="group px-5 py-4" key={question}><summary className="cursor-pointer list-none pr-8 text-sm font-semibold marker:hidden">{question}</summary><p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{answer}</p></details>)}</div></Card>
    <Card className="max-w-4xl"><div className="flex items-start gap-3"><MessageSquareText className="mt-0.5 size-5 shrink-0 text-accent" /><div><h2 className="text-sm font-semibold">Contact support</h2>{email ? <><p className="mt-2 text-sm text-muted">Use your email application to contact the configured TradePilot support address.</p><a className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent/90" href={`mailto:${email}?subject=TradePilot%20support`}><Mail className="size-4" />Email support</a></> : <p className="mt-2 text-sm leading-6 text-muted">A support email is not configured. Contact your workspace administrator through your established channel. This page does not submit a ticket.</p>}<p className="mt-4 text-xs text-muted">Never send passwords, PINs, or one-time passwords.</p></div></div></Card>
  </div>
}
export default Support
