import { useEffect, useState } from 'react'
import { Activity, ArrowRight, BarChart3, Globe2, LineChart, ShieldCheck, Sparkles, WalletCards } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import { getTicker } from '../services/marketService.js'
import { marketBySymbol } from '../data/markets.js'
import { formatPercent, formatPrice } from '../utils/marketFormatters.js'

const previewSymbols = ['BTCUSDT', 'ETHUSDT', 'XAUUSD']
const features = [
  [LineChart, 'Live Crypto Market Data', 'Follow public Crypto quotes and market movement from Binance.'],
  [Globe2, 'Forex & Gold Market Data', 'Track Forex pairs and XAU/USD through the configured market-data proxy.'],
  [Activity, 'Simulated Trading', 'Practice market orders and manage positions without real-money execution.'],
  [WalletCards, 'Portfolio Tracking', 'Follow balances, market value, and live simulated profit and loss.'],
  [BarChart3, 'Analytics', 'Review activity, outcomes, fees, and market-level performance.'],
  [ShieldCheck, 'Secure Account System', 'Use protected account routes with Firebase authentication and role-based access.'],
]

function Landing() {
  const navigate = useNavigate()
  const [tickers, setTickers] = useState(new Map())
  useEffect(() => { let active = true; Promise.allSettled(previewSymbols.map((symbol) => getTicker(symbol))).then((results) => { if (!active) return; const items = results.filter((result) => result.status === 'fulfilled').map((result) => result.value); setTickers(new Map(items.map((item) => [item.symbol, item]))) }); return () => { active = false } }, [])
  return (
    <div className="min-h-dvh overflow-hidden bg-canvas text-foreground">
      <header className="border-b border-border/80 bg-canvas/90 backdrop-blur-xl">
        <nav
          aria-label="Primary navigation"
          className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        >
          <Link className="flex items-center gap-3" to="/">
            <span className="grid size-9 place-items-center rounded-lg bg-accent text-white">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </span>
            <span className="text-base font-bold tracking-tight">TradePilot</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:text-foreground sm:block"
              to="/login"
            >
              Sign In
            </Link>
            <Link
              className="inline-flex h-9 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent-strong"
              to="/signup"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative border-b border-border/80">
          <div aria-hidden="true" className="auth-grid absolute inset-0 opacity-40" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-32">
            <div className="max-w-2xl">
              <Badge className="mb-6 gap-1.5" variant="neutral">
                <Sparkles aria-hidden="true" className="size-3" />
                A modern market workspace
              </Badge>
              <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                One clear view across
                <span className="text-accent"> global markets.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg">
                A focused platform for tracking forex and digital assets, built around clarity, speed, and disciplined decisions.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => navigate('/signup')} size="lg">
                  Get Started
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
                <Button onClick={() => navigate('/markets')} size="lg" variant="secondary">
                  Explore Markets
                </Button>
              </div>
              <p className="mt-5 text-xs text-muted">Product preview · No live trading enabled</p>
            </div>

            <Card className="relative overflow-hidden" elevated padding="none">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <p className="text-xs text-muted">Market overview</p>
                  <h2 className="mt-1 text-sm font-semibold">Selected instruments</h2>
                </div>
                <span className="grid size-9 place-items-center rounded-lg bg-accent/10 text-accent">
                  <BarChart3 aria-hidden="true" className="size-4" />
                </span>
              </div>
              <div className="divide-y divide-border">
                {previewSymbols.map((symbol) => { const market = marketBySymbol.get(symbol); const ticker = tickers.get(symbol); return (
                  <div className="grid grid-cols-[1fr_auto] items-center gap-5 px-5 py-4" key={symbol}>
                    <div>
                      <p className="text-sm font-semibold">{market.displaySymbol}</p>
                      <p className="mt-0.5 text-xs capitalize text-muted">{market.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="financial-value text-sm">{ticker ? formatPrice(ticker.price, market) : 'Waiting…'}</p>
                      <p className={`financial-value mt-0.5 text-xs ${(ticker?.changePercent || 0) < 0 ? 'text-negative' : 'text-positive'}`}>
                        {ticker ? formatPercent(ticker.changePercent) : '—'}
                      </p>
                    </div>
                  </div>
                )})}
              </div>
              <div className="border-t border-border bg-elevated/60 px-5 py-4 text-center text-xs text-muted">
                Public market data preview
              </div>
            </Card>
          </div>
        </section>

        <section aria-labelledby="features-title" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Built for practice</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl" id="features-title">A complete simulated trading workspace.</h2>
            <p className="mt-3 text-sm leading-6 text-muted">Explore real public market data with account tools designed for learning and review.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([Icon, title, description]) => (
              <Card key={title}>
                <span className="grid size-9 place-items-center rounded-lg bg-accent/10 text-accent"><Icon aria-hidden="true" className="size-4" /></span>
                <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">TradePilot</p>
              <h2 className="mt-2 text-xl font-semibold">Your market workspace is ready.</h2>
              <p className="mt-1 text-sm text-muted">Explore live public markets and simulated account tools.</p>
            </div>
            <Button className="sm:self-center" onClick={() => navigate('/login')}>Open dashboard</Button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Landing
