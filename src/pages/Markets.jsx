import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, Search, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Badge from '../components/common/Badge.jsx'
import Card from '../components/common/Card.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import PriceChange from '../components/trading/PriceChange.jsx'
import useAuth from '../hooks/useAuth.js'
import { getMarketSymbols, getTicker, marketDataSource } from '../services/marketService.js'
import { addSymbol, removeSymbol, subscribeToWatchlist } from '../services/watchlistService.js'
import { getFirestoreErrorMessage } from '../utils/firestoreErrors.js'
import { formatPrice, formatVolume } from '../utils/marketFormatters.js'

const tabs = ['All', 'Crypto', 'Forex']

function Markets() {
  const [markets, setMarkets] = useState([])
  const [tickers, setTickers] = useState(new Map())
  const [symbols, setSymbols] = useState([])
  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pending, setPending] = useState('')
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    getMarketSymbols().then(async (available) => {
      const values = await Promise.all(available.map((market) => getTicker(market.symbol)))
      if (active) { setMarkets(available); setTickers(new Map(values.map((ticker) => [ticker.symbol, ticker]))); setLoading(false) }
    }).catch(() => { if (active) { setError('Market data could not be loaded.'); setLoading(false) } })
    return () => { active = false }
  }, [])

  useEffect(() => subscribeToWatchlist(currentUser.uid, (watchlist) => setSymbols(watchlist?.symbols || []), (requestError) => setError(getFirestoreErrorMessage(requestError))), [currentUser.uid])

  const visible = useMemo(() => markets.filter((market) => {
    const matchesTab = tab === 'All' || market.category === tab
    const matchesSearch = `${market.symbol} ${market.displaySymbol} ${market.name}`.toLowerCase().includes(search.toLowerCase())
    return matchesTab && matchesSearch
  }), [markets, search, tab])

  const toggleWatchlist = async (event, symbol) => {
    event.stopPropagation()
    setPending(symbol)
    setError('')
    try { await (symbols.includes(symbol) ? removeSymbol(currentUser.uid, symbol) : addSymbol(currentUser.uid, symbol)) }
    catch (requestError) { setError(getFirestoreErrorMessage(requestError)) }
    finally { setPending('') }
  }

  return <div className="space-y-6">
    <PageHeader description="Explore the initial crypto and forex universe before opening a chart." eyebrow="Market data" title="Markets" actions={<Badge variant="warning">{marketDataSource}</Badge>} />
    {error && <div className="flex gap-2 rounded-lg border border-negative/25 bg-negative/10 p-3 text-sm text-negative" role="alert"><CircleAlert className="size-4 shrink-0" />{error}</div>}
    <Card padding="none">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1">{tabs.map((item) => <button className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${tab === item ? 'bg-accent/12 text-accent' : 'text-muted hover:bg-elevated hover:text-foreground'}`} key={item} onClick={() => setTab(item)} type="button">{item}</button>)}</div>
        <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input aria-label="Search markets" className="h-10 w-full rounded-lg border border-border bg-elevated pl-9 pr-3 text-sm outline-none focus:border-accent" onChange={(event) => setSearch(event.target.value)} placeholder="Search markets" value={search} /></div>
      </div>
      {loading ? <div className="grid gap-3 p-5" role="status">{[1, 2, 3, 4, 5].map((item) => <span className="h-14 animate-pulse rounded-lg bg-elevated" key={item} />)}</div> : visible.length === 0 ? <div className="grid min-h-56 place-items-center p-8 text-center"><div><Search className="mx-auto size-6 text-muted" /><h2 className="mt-3 text-sm font-semibold">No markets found</h2><p className="mt-1 text-xs text-muted">Try another symbol or category.</p></div></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-[0.14em] text-muted"><tr><th className="px-5 py-3">Market</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">24h change</th><th className="px-5 py-3">24h high</th><th className="px-5 py-3">24h low</th><th className="px-5 py-3">Volume</th><th className="px-5 py-3 text-center">Watchlist</th></tr></thead><tbody className="divide-y divide-border">{visible.map((market) => { const ticker = tickers.get(market.symbol); return <tr className="cursor-pointer transition hover:bg-elevated/50" key={market.symbol} onClick={() => navigate(`/trade?symbol=${market.symbol}`)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') navigate(`/trade?symbol=${market.symbol}`) }}><td className="px-5 py-4"><p className="text-sm font-semibold">{market.displaySymbol}</p><p className="text-xs text-muted">{market.name}</p></td><td className="financial-value px-5 py-4 text-sm">{formatPrice(ticker?.price, market)}</td><td className="px-5 py-4"><PriceChange amount={ticker?.change} showAmount value={ticker?.changePercent || 0} /></td><td className="financial-value px-5 py-4 text-sm text-muted">{formatPrice(ticker?.high24h, market)}</td><td className="financial-value px-5 py-4 text-sm text-muted">{formatPrice(ticker?.low24h, market)}</td><td className="financial-value px-5 py-4 text-sm text-muted">{formatVolume(ticker?.volume24h)}</td><td className="px-5 py-4 text-center"><button aria-label={`${symbols.includes(market.symbol) ? 'Remove' : 'Add'} ${market.displaySymbol} ${symbols.includes(market.symbol) ? 'from' : 'to'} watchlist`} className={`rounded-lg p-2 transition hover:bg-border ${symbols.includes(market.symbol) ? 'text-warning' : 'text-muted'}`} disabled={pending === market.symbol} onClick={(event) => toggleWatchlist(event, market.symbol)} title="Toggle watchlist" type="button"><Star className="size-4" fill={symbols.includes(market.symbol) ? 'currentColor' : 'none'} /></button></td></tr> })}</tbody></table></div>}
    </Card>
  </div>
}

export default Markets
