import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft,
  BriefcaseBusiness,
  ArrowUpRight,
  CircleDollarSign,
  Plus,
  WalletCards,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import MarketCard from '../components/trading/MarketCard.jsx'
import useAuth from '../hooks/useAuth.js'
import useWallet from '../hooks/useWallet.js'
import { getTicker, subscribeToTicker } from '../services/marketService.js'
import { subscribeToPositions } from '../services/positionService.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { calculatePositionPnl } from '../utils/pnl.js'

const activities = [
  { label: 'BTC position adjusted', time: '12 minutes ago', value: '+$184.20', positive: true },
  { label: 'EUR/USD position closed', time: '2 hours ago', value: '+$62.80', positive: true },
  { label: 'Wallet withdrawal', time: 'Yesterday', value: '-$500.00', positive: false },
]

const watchlist = [
  { symbol: 'EUR/USD', price: '1.08642', change: '+0.24%', positive: true },
  { symbol: 'BTC/USD', price: '68,420.10', change: '+1.82%', positive: true },
  { symbol: 'ETH/USD', price: '3,582.46', change: '-0.38%', positive: false },
  { symbol: 'GBP/JPY', price: '201.485', change: '+0.12%', positive: true },
]

const overviewSymbols = ['BTCUSDT', 'ETHUSDT', 'EURUSD', 'GBPUSD']

function Dashboard() {
  const { currentUser, userProfile } = useAuth()
  const { wallet, loading: walletLoading, error: walletError } = useWallet()
  const [marketTickers, setMarketTickers] = useState(new Map())
  const [positions, setPositions] = useState([])
  const [positionTickers, setPositionTickers] = useState(new Map())
  const [positionsLoading, setPositionsLoading] = useState(true)
  const navigate = useNavigate()
  const firstName = (userProfile?.fullName || currentUser?.displayName || '').trim().split(/\s+/)[0]
  const currency = wallet?.currency || 'USD'
  const openPositions = useMemo(() => positions.filter((position) => position.status === 'open' && position.quantity > 0), [positions])
  const positionSymbols = useMemo(() => openPositions.map((position) => position.symbol), [openPositions])
  const positionValues = openPositions.map((position) => calculatePositionPnl(position, positionTickers.get(position.symbol)?.price))
  const openPositionsValue = positionValues.reduce((total, value) => total + (value.marketValue || 0), 0)
  const unrealizedPnl = positionValues.reduce((total, value) => total + (value.unrealizedPnl || 0), 0)
  const accountEquity = (wallet?.availableBalance || 0) + openPositionsValue
  const accountLoading = walletLoading || positionsLoading
  const metrics = [
    {
      label: 'Total account equity',
      value: wallet ? formatCurrency(accountEquity, currency) : 'Unavailable',
      detail: 'Available cash plus positions',
      icon: WalletCards,
    },
    {
      label: 'Available balance',
      value: wallet ? formatCurrency(wallet.availableBalance, currency) : 'Unavailable',
      detail: 'Funds currently available',
      icon: CircleDollarSign,
    },
    {
      label: 'Open positions value',
      value: formatCurrency(openPositionsValue, currency),
      detail: `${openPositions.length} open position${openPositions.length === 1 ? '' : 's'}`,
      icon: BriefcaseBusiness,
    },
    {
      label: 'Unrealized P/L',
      value: formatCurrency(unrealizedPnl, currency),
      detail: 'Live frontend valuation',
      icon: ArrowUpRight,
    },
  ]

  useEffect(() => {
    let active = true
    Promise.allSettled(overviewSymbols.filter((symbol) => symbol.endsWith('USDT')).map(getTicker)).then((results) => {
      if (!active) return
      const values = results.filter((result) => result.status === 'fulfilled').map((result) => result.value)
      setMarketTickers(new Map(values.map((ticker) => [ticker.symbol, ticker])))
    })
    return () => { active = false }
  }, [])

  useEffect(() => subscribeToPositions(currentUser.uid, (items) => { setPositions(items); setPositionsLoading(false) }, () => setPositionsLoading(false)), [currentUser.uid])

  useEffect(() => {
    const unsubscribe = positionSymbols.map((symbol) => subscribeToTicker(symbol, (ticker) => setPositionTickers((current) => new Map(current).set(symbol, ticker))))
    return () => unsubscribe.forEach((stop) => stop())
  }, [positionSymbols])

  useEffect(() => {
    const unsubscribe = overviewSymbols.map((symbol) => subscribeToTicker(
      symbol,
      (ticker) => setMarketTickers((current) => new Map(current).set(ticker.symbol, ticker)),
      undefined,
      (status) => setMarketTickers((current) => {
        const ticker = current.get(symbol)
        if (!ticker) return current
        return new Map(current).set(symbol, { ...ticker, connectionStatus: status })
      }),
    ))
    return () => unsubscribe.forEach((stop) => stop())
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <>
            <Button
              className="hidden sm:inline-flex"
              onClick={() => navigate('/deposit')}
              variant="secondary"
            >
              <ArrowDownLeft aria-hidden="true" className="size-4" />
              Deposit
            </Button>
            <Button onClick={() => navigate('/markets')}>
              <Plus aria-hidden="true" className="size-4" />
              New order
            </Button>
          </>
        }
        description="A concise view of your account and market activity."
        eyebrow="Overview"
        title={`Good morning${firstName ? `, ${firstName}` : ''}`}
      />

      {walletError && (
        <div className="rounded-lg border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning">
          {walletError}
        </div>
      )}

      <section aria-label="Account summary" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <Card className="min-w-0" key={label}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted">{label}</p>
                {accountLoading ? (
                  <span className="mt-3 block h-7 w-32 animate-pulse rounded bg-elevated" />
                ) : (
                  <p className="financial-value mt-3 truncate text-xl font-semibold text-foreground">
                    {value}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted">{detail}</p>
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-elevated text-muted">
                <Icon aria-hidden="true" className="size-4" />
              </span>
            </div>
          </Card>
        ))}
      </section>

      <section aria-labelledby="market-overview-title">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><h2 className="text-sm font-semibold" id="market-overview-title">Market overview</h2><p className="mt-1 text-xs text-muted">Binance crypto · Live Forex when configured</p></div>
          <Button onClick={() => navigate('/markets')} size="sm" variant="ghost">All markets</Button>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {['crypto', 'forex'].map((type) => <div key={type}><h3 className="mb-2 text-xs font-semibold capitalize text-muted">{type} market overview</h3><div className="grid gap-3 sm:grid-cols-2">{overviewSymbols.filter((symbol) => (type === 'crypto' ? symbol.endsWith('USDT') : !symbol.endsWith('USDT'))).map((symbol) => { const ticker = marketTickers.get(symbol); return ticker ? <MarketCard key={symbol} onClick={() => navigate(`/trade?symbol=${symbol}`)} ticker={ticker} /> : <span className="h-36 rounded-xl border border-border bg-surface p-4 text-xs text-muted" key={symbol}>Market data unavailable</span> })}</div></div>)}
        </div>
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.75fr)]">
        <Card className="min-w-0" padding="none">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Account equity</h2>
              <p className="mt-1 text-xs text-muted">Cash plus live open-position value</p>
            </div>
            <Badge variant="neutral">Live valuation</Badge>
          </div>
          <div className="px-5 pb-5 pt-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                {accountLoading ? <span className="block h-8 w-40 animate-pulse rounded bg-elevated" /> : <p className="financial-value text-2xl font-semibold">{formatCurrency(accountEquity, currency)}</p>}
                {!accountLoading && <p className={`financial-value mt-1 text-xs ${unrealizedPnl >= 0 ? 'text-positive' : 'text-negative'}`}>{formatCurrency(unrealizedPnl, currency)} unrealized P/L</p>}
              </div>
              <Badge variant={unrealizedPnl >= 0 ? 'positive' : 'negative'}>
                <ArrowUpRight aria-hidden="true" className="mr-1 size-3" />
                {openPositions.length} open
              </Badge>
            </div>
            <div className="relative mt-7 h-64 overflow-hidden rounded-lg border border-border/70 bg-elevated/50">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:64px_48px] opacity-35" />
              <svg
                aria-label="Decorative account-equity visual"
                className="absolute inset-0 h-full w-full text-accent"
                preserveAspectRatio="none"
                role="img"
                viewBox="0 0 800 260"
              >
                <defs>
                  <linearGradient id="dashboard-chart-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.24" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 225 C70 208 95 218 145 190 S245 205 298 157 S388 173 448 120 S545 144 600 98 S700 112 800 42 L800 260 L0 260 Z"
                  fill="url(#dashboard-chart-fill)"
                />
                <path
                  d="M0 225 C70 208 95 218 145 190 S245 205 298 157 S388 173 448 120 S545 144 600 98 S700 112 800 42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </div>
        </Card>

        <Card padding="none">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Watchlist</h2>
              <p className="mt-1 text-xs text-muted">Selected markets</p>
            </div>
            <Button className="h-8 px-2.5" size="sm" variant="ghost">View all</Button>
          </div>
          <div className="divide-y divide-border">
            {watchlist.map((item) => (
              <div className="flex items-center justify-between gap-4 px-5 py-4" key={item.symbol}>
                <div>
                  <p className="text-sm font-semibold">{item.symbol}</p>
                  <p className="mt-0.5 text-[11px] text-muted">Spot market</p>
                </div>
                <div className="text-right">
                  <p className="financial-value text-sm">{item.price}</p>
                  <p className={`financial-value mt-0.5 text-xs ${item.positive ? 'text-positive' : 'text-negative'}`}>
                    {item.change}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padding="none">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Recent activity</h2>
            <p className="mt-1 text-xs text-muted">Latest account events</p>
          </div>
          <Button size="sm" variant="ghost">All transactions</Button>
        </div>
        <div className="divide-y divide-border">
          {activities.map((activity) => (
            <div className="flex items-center justify-between gap-4 px-5 py-4" key={activity.label}>
              <div className="flex min-w-0 items-center gap-3">
                <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${activity.positive ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
                  {activity.positive ? (
                    <ArrowUpRight aria-hidden="true" className="size-4" />
                  ) : (
                    <ArrowDownLeft aria-hidden="true" className="size-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{activity.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{activity.time}</p>
                </div>
              </div>
              <p className={`financial-value shrink-0 text-sm ${activity.positive ? 'text-positive' : 'text-negative'}`}>
                {activity.value}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default Dashboard
