import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, LoaderCircle, Star, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import PriceChange from '../components/trading/PriceChange.jsx'
import { marketBySymbol } from '../data/markets.js'
import useAuth from '../hooks/useAuth.js'
import { getTicker, marketDataSource } from '../services/marketService.js'
import { removeSymbol, subscribeToWatchlist } from '../services/watchlistService.js'
import { getFirestoreErrorMessage } from '../utils/firestoreErrors.js'
import { formatPrice } from '../utils/marketFormatters.js'

function Watchlist() {
  const [symbols, setSymbols] = useState([])
  const [tickers, setTickers] = useState(new Map())
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => subscribeToWatchlist(currentUser.uid, (watchlist) => { setSymbols(watchlist?.symbols || []); setLoading(false) }, (requestError) => { setError(getFirestoreErrorMessage(requestError)); setLoading(false) }), [currentUser.uid])

  useEffect(() => {
    let active = true
    Promise.all(symbols.filter((symbol) => marketBySymbol.has(symbol)).map(getTicker))
      .then((values) => active && setTickers(new Map(values.map((ticker) => [ticker.symbol, ticker]))))
      .catch(() => active && setError('Watchlist market data could not be loaded.'))
    return () => { active = false }
  }, [symbols])

  const supportedSymbols = useMemo(() => symbols.filter((symbol) => marketBySymbol.has(symbol)), [symbols])
  const remove = async (symbol) => {
    setPending(symbol); setError('')
    try { await removeSymbol(currentUser.uid, symbol) }
    catch (requestError) { setError(getFirestoreErrorMessage(requestError)) }
    finally { setPending('') }
  }

  return <div className="space-y-6">
    <PageHeader description="Your persistent Firestore watchlist enriched with development market data." eyebrow="Activity" title="Watchlist" actions={<Badge variant="warning">{marketDataSource}</Badge>} />
    {error && <div className="flex gap-2.5 rounded-lg border border-negative/25 bg-negative/10 p-3 text-sm text-negative" role="alert"><CircleAlert className="mt-0.5 size-4 shrink-0" /><p>{error}</p></div>}
    <Card padding="none">
      {loading ? <div className="grid gap-3 p-5" role="status">{[1, 2, 3].map((item) => <span className="h-14 animate-pulse rounded-lg bg-elevated" key={item} />)}</div> : supportedSymbols.length === 0 ? <div className="grid min-h-56 place-items-center p-8 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-xl bg-elevated text-muted"><Star className="size-5" /></span><h2 className="mt-4 text-sm font-semibold">Your watchlist is empty</h2><p className="mt-1 text-xs text-muted">Star instruments on the Markets page to add them here.</p><Button className="mt-4" onClick={() => navigate('/markets')} size="sm" variant="secondary">Browse markets</Button></div></div> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-[0.14em] text-muted"><tr><th className="px-5 py-3">Symbol</th><th className="px-5 py-3">Type</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">24h change</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-border">{supportedSymbols.map((symbol) => { const market = marketBySymbol.get(symbol); const ticker = tickers.get(symbol); return <tr key={symbol}><td className="px-5 py-4"><p className="text-sm font-semibold">{market.displaySymbol}</p><p className="text-xs text-muted">{market.name}</p></td><td className="px-5 py-4"><Badge variant="neutral">{market.type}</Badge></td><td className="financial-value px-5 py-4 text-sm">{formatPrice(ticker?.price, market)}</td><td className="px-5 py-4"><PriceChange value={ticker?.changePercent || 0} /></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Button onClick={() => navigate(`/trade?symbol=${symbol}`)} size="sm">Open trade</Button><Button aria-label={`Remove ${market.displaySymbol} from watchlist`} className="size-8 px-0" disabled={Boolean(pending)} onClick={() => remove(symbol)} size="sm" title="Remove from watchlist" variant="ghost">{pending === symbol ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</Button></div></td></tr> })}</tbody></table></div>}
    </Card>
  </div>
}

export default Watchlist
