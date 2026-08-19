import { useEffect, useState } from 'react'
import { CircleAlert, LoaderCircle, Plus, Star, Trash2 } from 'lucide-react'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import Select from '../components/common/Select.jsx'
import useAuth from '../hooks/useAuth.js'
import { addSymbol, removeSymbol, subscribeToWatchlist } from '../services/watchlistService.js'
import { getFirestoreErrorMessage } from '../utils/firestoreErrors.js'

const supportedSymbols = ['BTCUSDT', 'ETHUSDT', 'EURUSD', 'GBPUSD']

function Watchlist() {
  const [watchlist, setWatchlist] = useState(null)
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT')
  const [loading, setLoading] = useState(true)
  const [pendingSymbol, setPendingSymbol] = useState('')
  const [error, setError] = useState('')
  const { currentUser } = useAuth()

  useEffect(() => {
    return subscribeToWatchlist(
      currentUser.uid,
      (nextWatchlist) => {
        setWatchlist(nextWatchlist)
        setError(nextWatchlist ? '' : 'Your Firestore watchlist has not been initialized yet.')
        setLoading(false)
      },
      (requestError) => {
        setError(getFirestoreErrorMessage(requestError))
        setLoading(false)
      },
    )
  }, [currentUser.uid])

  const handleAdd = async (event) => {
    event.preventDefault()
    setPendingSymbol(selectedSymbol)
    setError('')

    try {
      await addSymbol(currentUser.uid, selectedSymbol)
    } catch (requestError) {
      setError(getFirestoreErrorMessage(requestError))
    } finally {
      setPendingSymbol('')
    }
  }

  const handleRemove = async (symbol) => {
    setPendingSymbol(symbol)
    setError('')

    try {
      await removeSymbol(currentUser.uid, symbol)
    } catch (requestError) {
      setError(getFirestoreErrorMessage(requestError))
    } finally {
      setPendingSymbol('')
    }
  }

  const symbols = watchlist?.symbols || []

  return (
    <div className="space-y-6">
      <PageHeader
        description="A Firestore-backed list of symbols. Live prices will be added in a later phase."
        eyebrow="Activity"
        title="Watchlist"
      />

      {error && (
        <div className="flex gap-2.5 rounded-lg border border-negative/25 bg-negative/10 p-3 text-sm text-negative" role="alert">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <Card className="max-w-3xl" padding="none">
        <form className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-end" onSubmit={handleAdd}>
          <Select
            className="flex-1"
            label="Development symbol selector"
            onChange={(event) => setSelectedSymbol(event.target.value)}
            value={selectedSymbol}
          >
            {supportedSymbols.map((symbol) => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </Select>
          <Button disabled={Boolean(pendingSymbol) || !watchlist} type="submit">
            {pendingSymbol === selectedSymbol ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Plus aria-hidden="true" className="size-4" />
            )}
            Add symbol
          </Button>
        </form>

        {loading ? (
          <div className="grid gap-3 p-5" role="status">
            {[1, 2, 3].map((item) => (
              <span className="h-12 animate-pulse rounded-lg bg-elevated" key={item} />
            ))}
          </div>
        ) : symbols.length === 0 ? (
          <div className="grid min-h-56 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid size-11 place-items-center rounded-xl bg-elevated text-muted">
                <Star aria-hidden="true" className="size-5" />
              </span>
              <h2 className="mt-4 text-sm font-semibold">Your watchlist is empty</h2>
              <p className="mt-1 text-xs text-muted">Use the selector above to add a symbol.</p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {symbols.map((symbol) => (
              <li className="flex items-center justify-between gap-4 px-5 py-4" key={symbol}>
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-accent/10 text-accent">
                    <Star aria-hidden="true" className="size-4" />
                  </span>
                  <div>
                    <p className="financial-value text-sm font-semibold">{symbol}</p>
                    <p className="mt-0.5 text-xs text-muted">Price data not connected</p>
                  </div>
                </div>
                <Button
                  aria-label={`Remove ${symbol}`}
                  className="size-9 px-0"
                  disabled={Boolean(pendingSymbol)}
                  onClick={() => handleRemove(symbol)}
                  variant="ghost"
                >
                  {pendingSymbol === symbol ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Trash2 aria-hidden="true" className="size-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export default Watchlist
