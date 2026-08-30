import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CircleAlert, Copy, ReceiptText } from 'lucide-react'
import Badge from '../components/common/Badge.jsx'
import Card from '../components/common/Card.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import Button from '../components/common/Button.jsx'
import Modal from '../components/common/Modal.jsx'
import SearchInput from '../components/common/SearchInput.jsx'
import useAuth from '../hooks/useAuth.js'
import { subscribeToDepositRequests } from '../services/depositService.js'
import { subscribeToWithdrawalRequests } from '../services/withdrawalService.js'
import { subscribeToTrades } from '../services/tradeService.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { getFirestoreErrorMessage } from '../utils/firestoreErrors.js'
import { maskAccount, requestAccount } from '../utils/paymentDetails.js'
import { formatPrice, formatQuantity } from '../utils/marketFormatters.js'
import { marketBySymbol } from '../data/markets.js'

const tabs = ['All', 'Deposits', 'Withdrawals', 'Trades']

function formatDate(timestamp) {
  const date = timestamp?.toDate?.()
  if (!date) return 'Pending timestamp'

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function Transactions() {
  const [activeTab, setActiveTab] = useState('All')
  const [deposits, setDeposits] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState({ deposits: true, withdrawals: true, trades: true })
  const [error, setError] = useState('')
  const [tradeSide, setTradeSide] = useState('All')
  const [tradeSearch, setTradeSearch] = useState('')
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [copied, setCopied] = useState(false)
  const { currentUser } = useAuth()

  useEffect(() => {
    const handleError = (requestError) => {
      setError(getFirestoreErrorMessage(requestError))
      setLoading({ deposits: false, withdrawals: false, trades: false })
    }

    const unsubscribeDeposits = subscribeToDepositRequests(
      currentUser.uid,
      (items) => {
        setDeposits(items.map((item) => ({ ...item, type: 'Deposit' })))
        setLoading((current) => ({ ...current, deposits: false }))
      },
      handleError,
    )

    const unsubscribeWithdrawals = subscribeToWithdrawalRequests(
      currentUser.uid,
      (items) => {
        setWithdrawals(items.map((item) => ({ ...item, type: 'Withdrawal' })))
        setLoading((current) => ({ ...current, withdrawals: false }))
      },
      handleError,
    )

    const unsubscribeTrades = subscribeToTrades(
      currentUser.uid,
      (items) => {
        setTrades(items)
        setLoading((current) => ({ ...current, trades: false }))
      },
      handleError,
    )

    return () => {
      unsubscribeDeposits()
      unsubscribeWithdrawals()
      unsubscribeTrades()
    }
  }, [currentUser.uid])

  const visibleItems = useMemo(() => {
    const combined = [...deposits, ...withdrawals].sort((first, second) => {
      const firstTime = first.createdAt?.toMillis?.() || 0
      const secondTime = second.createdAt?.toMillis?.() || 0
      return secondTime - firstTime
    })

    if (activeTab === 'Deposits') return deposits
    if (activeTab === 'Withdrawals') return withdrawals
    if (activeTab === 'Trades') return trades.filter((trade) => (tradeSide === 'All' || trade.side === tradeSide.toUpperCase()) && trade.symbol.toLowerCase().includes(tradeSearch.toLowerCase()))
    return combined
  }, [activeTab, deposits, tradeSearch, tradeSide, trades, withdrawals])

  const copyTradeId = async () => {
    try {
      await navigator.clipboard.writeText(selectedTrade.id)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Unable to copy the trade ID. Select and copy it manually.')
    }
  }

  const isLoading = activeTab === 'Trades'
    ? loading.trades
    : loading.deposits || loading.withdrawals

  return (
    <div className="space-y-6">
      <PageHeader
        description="Your funding activity and simulated market orders."
        eyebrow="Activity"
        title="Transactions"
      />

      {error && (
        <div className="flex gap-2.5 rounded-lg border border-negative/25 bg-negative/10 p-3 text-sm text-negative" role="alert">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <Card padding="none">
        <div className="flex gap-1 overflow-x-auto border-b border-border p-3">
          {tabs.map((tab) => (
            <button
              className={`shrink-0 cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition ${activeTab === tab ? 'bg-accent/12 text-accent' : 'text-muted hover:bg-elevated hover:text-foreground'}`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
        {activeTab === 'Trades' && <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-1">{['All', 'Buy', 'Sell'].map((side) => <button aria-pressed={tradeSide === side} className={`rounded-lg px-3 py-2 text-xs font-semibold ${tradeSide === side ? 'bg-accent/12 text-accent' : 'text-muted hover:bg-elevated'}`} key={side} onClick={() => setTradeSide(side)} type="button">{side}</button>)}</div><SearchInput aria-label="Search trades by symbol" className="w-full sm:max-w-xs" onChange={(event) => setTradeSearch(event.target.value)} placeholder="Search symbol" value={tradeSearch} /></div>}

        {isLoading ? (
          <div className="grid gap-3 p-5" role="status">
            {[1, 2, 3].map((item) => (
              <span className="h-14 animate-pulse rounded-lg bg-elevated" key={item} />
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid size-11 place-items-center rounded-xl bg-elevated text-muted">
                <ReceiptText aria-hidden="true" className="size-5" />
              </span>
              <h2 className="mt-4 text-sm font-semibold">No {activeTab.toLowerCase()} yet</h2>
              <p className="mt-1 text-xs text-muted">New request records will appear here.</p>
            </div>
          </div>
        ) : activeTab === 'Trades' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left">
              <thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Side</th>
                  <th className="px-5 py-3 font-semibold">Symbol</th>
                  <th className="px-5 py-3 font-semibold">Quantity</th>
                  <th className="px-5 py-3 font-semibold">Execution price</th>
                  <th className="px-5 py-3 font-semibold">Fee</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Net amount</th>
                  <th className="px-5 py-3 font-semibold">Realized P/L</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleItems.map((trade) => (
                  <tr className="cursor-pointer transition hover:bg-elevated/40" key={trade.id} onClick={() => { setSelectedTrade(trade); setCopied(false) }} onKeyDown={(event) => { if (event.key === 'Enter') setSelectedTrade(trade) }} tabIndex={0}>
                    <td className="px-5 py-4"><Badge variant={trade.side === 'BUY' ? 'positive' : 'negative'}>{trade.side}</Badge></td>
                    <td className="px-5 py-4 text-sm font-semibold">{trade.symbol}</td>
                    <td className="financial-value px-5 py-4 text-sm">{formatQuantity(trade.quantity)}</td>
                    <td className="financial-value px-5 py-4 text-sm">{formatPrice(trade.executionPrice, marketBySymbol.get(trade.symbol))}</td>
                    <td className="financial-value px-5 py-4 text-sm text-muted">{formatCurrency(trade.fee)}</td>
                    <td className="financial-value px-5 py-4 text-sm">{formatCurrency(trade.grossAmount)}</td>
                    <td className="financial-value px-5 py-4 text-sm">{formatCurrency(trade.netAmount)}</td>
                    <td className={`financial-value px-5 py-4 text-sm ${trade.realizedPnl > 0 ? 'text-positive' : trade.realizedPnl < 0 ? 'text-negative' : 'text-muted'}`}>
                      {trade.side === 'SELL' ? formatCurrency(trade.realizedPnl) : '—'}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted">{formatDate(trade.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Method</th>
                  <th className="px-5 py-3 font-semibold">Account</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visibleItems.map((item) => (
                  <tr key={`${item.type}-${item.id}`}>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {item.type === 'Deposit' ? (
                          <ArrowDownLeft aria-hidden="true" className="size-4 text-positive" />
                        ) : (
                          <ArrowUpRight aria-hidden="true" className="size-4 text-warning" />
                        )}
                        {item.type}
                      </span>
                    </td>
                    <td className="financial-value px-5 py-4 text-sm">
                      {formatCurrency(item.amount, item.currency)}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted">{item.method}</td>
                    <td className="financial-value px-5 py-4 text-sm text-muted">{maskAccount(requestAccount(item))}</td>
                    <td className="px-5 py-4">
                      <Badge variant={item.status === 'pending' ? 'warning' : 'neutral'}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted">{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Modal description={selectedTrade ? `${selectedTrade.side} · ${selectedTrade.symbol}` : ''} footer={<Button onClick={() => setSelectedTrade(null)} variant="secondary">Close</Button>} isOpen={Boolean(selectedTrade)} onClose={() => setSelectedTrade(null)} title="Trade details">
        {selectedTrade && <div className="space-y-4"><div className="rounded-lg border border-border bg-surface p-3"><p className="text-xs text-muted">Trade ID</p><div className="mt-2 flex items-center justify-between gap-3"><code className="min-w-0 break-all text-xs text-foreground">{selectedTrade.id}</code><Button aria-label="Copy trade ID" onClick={copyTradeId} size="sm" variant="ghost"><Copy className="size-3.5" />{copied ? 'Copied' : 'Copy'}</Button></div>{copied && <p className="mt-2 text-xs text-positive" role="status">Trade ID copied.</p>}</div><dl className="grid grid-cols-2 gap-4 text-sm">{[['Market', selectedTrade.symbol], ['Market type', selectedTrade.marketType], ['Side', selectedTrade.side], ['Quantity', selectedTrade.quantity], ['Execution price', formatCurrency(selectedTrade.executionPrice)], ['Gross amount', formatCurrency(selectedTrade.grossAmount)], ['Fee', formatCurrency(selectedTrade.fee)], ['Net amount', formatCurrency(selectedTrade.netAmount)], ['Realized P/L', selectedTrade.side === 'SELL' ? formatCurrency(selectedTrade.realizedPnl) : 'Not applicable'], ['Status', selectedTrade.status], ['Executed at', formatDate(selectedTrade.createdAt)]].map(([label, value]) => <div className={label === 'Executed at' ? 'col-span-2' : ''} key={label}><dt className="text-xs text-muted">{label}</dt><dd className="financial-value mt-1 break-words">{value}</dd></div>)}</dl></div>}
      </Modal>
    </div>
  )
}

export default Transactions
