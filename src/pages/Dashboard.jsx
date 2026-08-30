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
import { subscribeToTrades } from '../services/tradeService.js'
import { marketBySymbol } from '../data/markets.js'
import { formatPrice } from '../utils/marketFormatters.js'

const overviewSymbols = ['BTCUSDT', 'ETHUSDT', 'EURUSD', 'GBPUSD', 'XAUUSD']
const formatTradeDate = (timestamp) => timestamp?.toDate?.().toLocaleString() || 'Pending timestamp'

function Dashboard() {
  const { currentUser, userProfile } = useAuth()
  const { wallet, loading: walletLoading, error: walletError } = useWallet()
  const [marketTickers, setMarketTickers] = useState(new Map())
  const [positions, setPositions] = useState([])
  const [positionTickers, setPositionTickers] = useState(new Map())
  const [positionsLoading, setPositionsLoading] = useState(true)
  const [recentTrades, setRecentTrades] = useState([])
  const navigate = useNavigate()
  const firstName = (userProfile?.fullName || currentUser?.displayName || '').trim().split(/\s+/)[0]
  const currency = wallet?.currency || 'USD'
  const openPositions = useMemo(() => positions.filter((position) => position.status === 'open' && position.quantity > 0), [positions])
  const positionSymbols = useMemo(() => openPositions.map((position) => position.symbol), [openPositions])
  const positionValues = openPositions.map((position) => calculatePositionPnl(position, positionTickers.get(position.symbol)?.price))
  const openPositionsValue = positionValues.reduce((total, value) => total + (value.marketValue || 0), 0)
  const unrealizedPnl = positionValues.reduce((total, value) => total + (value.unrealizedPnl || 0), 0)
  const realizedPnl = positions.reduce((total, position) => total + (position.realizedPnl || 0), 0)
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
    { label: 'Realized P/L', value: formatCurrency(realizedPnl, currency), detail: 'Closed simulated quantities', icon: ArrowDownLeft },
    { label: 'Active trades', value: String(openPositions.length), detail: 'Long-only open positions', icon: BriefcaseBusiness },
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
  useEffect(() => subscribeToTrades(currentUser.uid, (items) => setRecentTrades(items.slice(0, 5)), () => {}), [currentUser.uid])

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

      <section aria-label="Account summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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
          {['crypto', 'forex'].map((type) => <div key={type}><h3 className="mb-2 text-xs font-semibold capitalize text-muted">{type} market overview</h3><div className="grid gap-3 sm:grid-cols-2">{overviewSymbols.filter((symbol) => (type === 'crypto' ? symbol.endsWith('USDT') : !symbol.endsWith('USDT'))).map((symbol) => { const ticker = marketTickers.get(symbol); return ticker ? <MarketCard key={symbol} onClick={() => navigate(`/trade?symbol=${symbol}`)} ticker={ticker} /> : <span className="h-36 rounded-xl border border-border bg-surface p-4 text-xs text-muted" key={symbol}>Waiting for quote…</span> })}</div></div>)}
        </div>
      </section>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.75fr)]">
        <Card className="min-w-0" padding="none">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Account equity</h2>
              <p className="mt-1 text-xs text-muted">Cash plus live open-position value</p>
            </div>
            <Button onClick={() => navigate('/portfolio')} size="sm" variant="ghost">View portfolio</Button>
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
            <div className="mt-7 rounded-lg border border-border/70 bg-elevated/50 p-5"><div className="flex h-3 overflow-hidden rounded-full bg-surface" role="img" aria-label="Current equity composition"><span className="bg-accent" style={{ width: `${accountEquity > 0 ? (wallet?.availableBalance || 0) / accountEquity * 100 : 0}%` }} /><span className="bg-positive" style={{ width: `${accountEquity > 0 ? openPositionsValue / accountEquity * 100 : 0}%` }} /></div><div className="mt-4 grid gap-3 text-xs sm:grid-cols-2"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-muted"><span className="size-2 rounded-full bg-accent" />Available cash</span><span className="financial-value">{formatCurrency(wallet?.availableBalance || 0, currency)}</span></div><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-muted"><span className="size-2 rounded-full bg-positive" />Open positions</span><span className="financial-value">{formatCurrency(openPositionsValue, currency)}</span></div></div></div>
          </div>
        </Card>

        <Card padding="none">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Watchlist</h2>
              <p className="mt-1 text-xs text-muted">Selected markets</p>
            </div>
            <Button className="h-8 px-2.5" onClick={() => navigate('/markets')} size="sm" variant="ghost">View all</Button>
          </div>
          <div className="divide-y divide-border">
            {overviewSymbols.map((symbol) => { const item = marketTickers.get(symbol); const market = marketBySymbol.get(symbol); return (
              <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-elevated/40" key={symbol} onClick={() => navigate(`/trade?symbol=${symbol}`)} type="button">
                <div>
                  <p className="text-sm font-semibold">{market.displaySymbol}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{market.category}</p>
                </div>
                <div className="text-right">
                  <p className="financial-value text-sm">{item ? formatPrice(item.price, market) : 'Waiting…'}</p>
                  <p className={`financial-value mt-0.5 text-xs ${(item?.changePercent || 0) >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {item ? `${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%` : '—'}
                  </p>
                </div>
              </button>
            )})}
          </div>
        </Card>
      </div>

      <Card padding="none">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Recent activity</h2>
            <p className="mt-1 text-xs text-muted">Latest account events</p>
          </div>
          <Button onClick={() => navigate('/transactions')} size="sm" variant="ghost">All transactions</Button>
        </div>
        <div className="divide-y divide-border">
          {recentTrades.length === 0 ? <div className="px-5 py-8 text-center text-sm text-muted">No simulated trades yet.</div> : recentTrades.map((trade) => (
            <div className="flex items-center justify-between gap-4 px-5 py-4" key={trade.id}>
              <div className="flex min-w-0 items-center gap-3">
                <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${trade.side === 'BUY' ? 'bg-positive/10 text-positive' : 'bg-negative/10 text-negative'}`}>
                  {trade.side === 'BUY' ? (
                    <ArrowUpRight aria-hidden="true" className="size-4" />
                  ) : (
                    <ArrowDownLeft aria-hidden="true" className="size-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{trade.side} {trade.symbol}</p>
                  <p className="mt-0.5 text-xs text-muted">{formatTradeDate(trade.createdAt)}</p>
                </div>
              </div>
              <p className={`financial-value shrink-0 text-sm ${trade.side === 'SELL' && trade.realizedPnl < 0 ? 'text-negative' : 'text-positive'}`}>
                {formatCurrency(trade.side === 'SELL' ? trade.realizedPnl : trade.grossAmount, currency)}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default Dashboard
