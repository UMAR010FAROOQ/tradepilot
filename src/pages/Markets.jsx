import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, Search, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/common/Card.jsx'
import IconButton from '../components/common/IconButton.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import SearchInput from '../components/common/SearchInput.jsx'
import MarketSourceBadge from '../components/trading/MarketSourceBadge.jsx'
import PriceChange from '../components/trading/PriceChange.jsx'
import useAuth from '../hooks/useAuth.js'
import { getMarketSymbols, getTicker, subscribeToTicker } from '../services/marketService.js'
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
  const [cryptoStatus, setCryptoStatus] = useState('connecting')
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    getMarketSymbols().then(async (available) => {
      if (active) setMarkets(available)
      const results = await Promise.allSettled(available.map((market) => getTicker(market.symbol)))
      if (!active) return
      const values = results.filter((result) => result.status === 'fulfilled').map((result) => result.value)
      setTickers(new Map(values.map((ticker) => [ticker.symbol, ticker])))
      if (results.some((result, index) => result.status === 'rejected' && available[index].type === 'crypto')) {
        setCryptoStatus('unavailable')
        setError('Live crypto data is temporarily unavailable. Forex demo data remains available.')
      }
      setLoading(false)
    }).catch(() => {
      if (active) { setError('Market definitions could not be loaded.'); setLoading(false) }
    })
    return () => { active = false }
  }, [])

  useEffect(() => subscribeToWatchlist(
    currentUser.uid,
    (watchlist) => setSymbols(watchlist?.symbols || []),
    (requestError) => setError(getFirestoreErrorMessage(requestError)),
  ), [currentUser.uid])

  useEffect(() => {
    const cryptoMarkets = markets.filter((market) => market.type === 'crypto')
    if (cryptoMarkets.length === 0) return undefined
    const unsubscribe = cryptoMarkets.map((market) => subscribeToTicker(
      market.symbol,
      (ticker) => setTickers((current) => new Map(current).set(ticker.symbol, ticker)),
      () => setError('Live crypto updates are temporarily unavailable.'),
      (status) => {
        setCryptoStatus(status)
        if (status === 'live') setError((current) => current.startsWith('Live crypto') ? '' : current)
      },
    ))
    return () => unsubscribe.forEach((stop) => stop())
  }, [markets])

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

  return (
    <div className="space-y-6">
      <PageHeader
        actions={<><MarketSourceBadge status={cryptoStatus} type="crypto" /><MarketSourceBadge type="forex" /></>}
        description="Explore the crypto and forex universe before opening a chart."
        eyebrow="Market data"
        title="Markets"
      />
      {error && <div className="flex gap-2 rounded-lg border border-negative/25 bg-negative/10 p-3 text-sm text-negative" role="alert"><CircleAlert className="size-4 shrink-0" />{error}</div>}
      <Card padding="none">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1">{tabs.map((item) => <button className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${tab === item ? 'bg-accent/12 text-accent' : 'text-muted hover:bg-elevated hover:text-foreground'}`} key={item} onClick={() => setTab(item)} type="button">{item}</button>)}</div>
          <SearchInput aria-label="Search markets" className="w-full sm:max-w-xs" onChange={(event) => setSearch(event.target.value)} placeholder="Search markets" value={search} />
        </div>
        {loading ? <div className="grid gap-3 p-5" role="status">{[1, 2, 3, 4, 5].map((item) => <span className="h-14 animate-pulse rounded-lg bg-elevated" key={item} />)}</div> : visible.length === 0 ? <div className="grid min-h-56 place-items-center p-8 text-center"><div><Search className="mx-auto size-6 text-muted" /><h2 className="mt-3 text-sm font-semibold">No markets found</h2><p className="mt-1 text-xs text-muted">Try another symbol or category.</p></div></div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left">
            <thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-[0.14em] text-muted"><tr><th className="px-5 py-3">Market</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">24h change</th><th className="px-5 py-3">24h high</th><th className="px-5 py-3">24h low</th><th className="px-5 py-3">Volume</th><th className="px-5 py-3 text-center">Watchlist</th></tr></thead>
            <tbody className="divide-y divide-border">{visible.map((market) => {
              const ticker = tickers.get(market.symbol)
              const openTrade = () => navigate(`/trade?symbol=${market.symbol}`)
              return <tr className="cursor-pointer transition hover:bg-elevated/50" key={market.symbol} onClick={openTrade} onKeyDown={(event) => { if (event.key === 'Enter') openTrade() }} tabIndex={0}>
                <td className="px-5 py-4"><p className="text-sm font-semibold">{market.displaySymbol}</p><p className="text-xs text-muted">{market.name}</p></td>
                <td className="financial-value px-5 py-4 text-sm">{formatPrice(ticker?.price, market)}</td>
                <td className="px-5 py-4">{ticker ? <PriceChange amount={ticker.change} showAmount value={ticker.changePercent} /> : <span className="text-xs text-negative">Unavailable</span>}</td>
                <td className="financial-value px-5 py-4 text-sm text-muted">{formatPrice(ticker?.high24h, market)}</td>
                <td className="financial-value px-5 py-4 text-sm text-muted">{formatPrice(ticker?.low24h, market)}</td>
                <td className="financial-value px-5 py-4 text-sm text-muted">{formatVolume(ticker?.volume24h)}</td>
                <td className="px-5 py-4 text-center"><IconButton aria-label={`${symbols.includes(market.symbol) ? 'Remove' : 'Add'} ${market.displaySymbol} ${symbols.includes(market.symbol) ? 'from' : 'to'} watchlist`} className={symbols.includes(market.symbol) ? 'text-warning [&_svg]:fill-current' : ''} disabled={pending === market.symbol} icon={Star} onClick={(event) => toggleWatchlist(event, market.symbol)} size="sm" title="Toggle watchlist" /></td>
              </tr>
            })}</tbody>
          </table></div>
        )}
      </Card>
    </div>
  )
}

export default Markets
