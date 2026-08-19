import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CircleAlert, ReceiptText } from 'lucide-react'
import Badge from '../components/common/Badge.jsx'
import Card from '../components/common/Card.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import useAuth from '../hooks/useAuth.js'
import { subscribeToDepositRequests } from '../services/depositService.js'
import { subscribeToWithdrawalRequests } from '../services/withdrawalService.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { getFirestoreErrorMessage } from '../utils/firestoreErrors.js'

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
  const [loading, setLoading] = useState({ deposits: true, withdrawals: true })
  const [error, setError] = useState('')
  const { currentUser } = useAuth()

  useEffect(() => {
    const handleError = (requestError) => {
      setError(getFirestoreErrorMessage(requestError))
      setLoading({ deposits: false, withdrawals: false })
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

    return () => {
      unsubscribeDeposits()
      unsubscribeWithdrawals()
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
    if (activeTab === 'Trades') return []
    return combined
  }, [activeTab, deposits, withdrawals])

  const isLoading = loading.deposits || loading.withdrawals

  return (
    <div className="space-y-6">
      <PageHeader
        description="Your deposit and withdrawal requests from Firestore."
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Method</th>
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
    </div>
  )
}

export default Transactions
