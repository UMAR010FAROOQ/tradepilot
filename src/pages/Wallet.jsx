import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Landmark,
  LockKeyhole,
  WalletCards,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import useWallet from '../hooks/useWallet.js'
import { formatCurrency } from '../utils/formatCurrency.js'

function WalletMetric({ icon: Icon, label, value, loading }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted">{label}</p>
          {loading ? (
            <span className="mt-3 block h-7 w-32 animate-pulse rounded bg-elevated" />
          ) : (
            <p className="financial-value mt-3 truncate text-xl font-semibold">{value}</p>
          )}
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-elevated text-muted">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
    </Card>
  )
}

function Wallet() {
  const { wallet, loading, error } = useWallet()
  const navigate = useNavigate()
  const currency = wallet?.currency || 'USD'

  const metrics = [
    {
      label: 'Available balance',
      value: wallet ? formatCurrency(wallet.availableBalance, currency) : 'Unavailable',
      icon: CircleDollarSign,
    },
    {
      label: 'Locked balance',
      value: wallet ? formatCurrency(wallet.lockedBalance, currency) : 'Unavailable',
      icon: LockKeyhole,
    },
    {
      label: 'Total deposited',
      value: wallet ? formatCurrency(wallet.totalDeposited, currency) : 'Unavailable',
      icon: ArrowDownLeft,
    },
    {
      label: 'Total withdrawn',
      value: wallet ? formatCurrency(wallet.totalWithdrawn, currency) : 'Unavailable',
      icon: ArrowUpRight,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button onClick={() => navigate('/deposit')} variant="secondary">
              <ArrowDownLeft aria-hidden="true" className="size-4" />
              Deposit
            </Button>
            <Button onClick={() => navigate('/withdraw')}>
              <ArrowUpRight aria-hidden="true" className="size-4" />
              Withdraw
            </Button>
          </>
        }
        description="Balances are read directly from your protected Firestore wallet."
        eyebrow="Account"
        title="Wallet"
      />

      {error && (
        <div className="rounded-lg border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning">
          {error}
        </div>
      )}

      <section aria-label="Wallet balances" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <WalletMetric key={metric.label} loading={loading} {...metric} />
        ))}
      </section>

      <Card className="max-w-xl">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-accent/10 text-accent">
            <Landmark aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">Wallet currency</p>
            <p className="financial-value mt-1 text-base font-semibold">
              {loading ? 'Loading…' : wallet?.currency || 'Unavailable'}
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-elevated/50 p-4 text-sm text-muted">
          <WalletCards aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>Balances can only change through future trusted backend approval processes.</p>
        </div>
      </Card>
    </div>
  )
}

export default Wallet
