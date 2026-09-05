import { useState } from 'react'
import { Clock3, XCircle } from 'lucide-react'
import { cancelPendingOrder } from '../../services/orderService.js'
import { formatPrice } from '../../utils/marketFormatters.js'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'
import Button from '../common/Button.jsx'
import Card from '../common/Card.jsx'
import Modal from '../common/Modal.jsx'

const formatDate = (timestamp) => timestamp?.toDate?.().toLocaleString() || 'Just now'

function PendingOrders({ market, onComplete, orders, userId }) {
  const [cancelling, setCancelling] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  if (!orders.length) return null
  const confirmCancel = async () => {
    setProcessing(true); setError('')
    try { await cancelPendingOrder(userId, cancelling.id); setCancelling(null); onComplete?.('Pending order cancelled.') }
    catch (requestError) { setError(getFirestoreErrorMessage(requestError)) }
    finally { setProcessing(false) }
  }
  return <Card padding="none"><div className="flex items-center gap-2 border-b border-border px-5 py-4"><Clock3 className="size-4 text-warning" /><h2 className="text-sm font-semibold">Pending orders</h2><span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">{orders.length}</span></div><div className="divide-y divide-border">{orders.map((order) => <article className="grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-center" key={order.id}><div><p className="text-sm font-semibold">Limit BUY · {order.quantity}</p><p className="mt-1 text-xs text-muted">Created {formatDate(order.createdAt)}</p></div><dl className="grid grid-cols-3 gap-3 text-xs"><div><dt className="text-muted">Limit</dt><dd className="financial-value mt-1">{formatPrice(order.limitPrice, market)}</dd></div><div><dt className="text-muted">SL</dt><dd className="financial-value mt-1">{order.stopLoss ? formatPrice(order.stopLoss, market) : '—'}</dd></div><div><dt className="text-muted">TP</dt><dd className="financial-value mt-1">{order.takeProfit ? formatPrice(order.takeProfit, market) : '—'}</dd></div></dl><Button onClick={() => { setError(''); setCancelling(order) }} size="sm" variant="ghost"><XCircle className="size-4" />Cancel</Button></article>)}</div><p className="border-t border-border px-5 py-3 text-[10px] text-muted">Pending simulated orders are evaluated while TradePilot is open.</p><Modal description={cancelling ? `${market.displaySymbol} limit buy at ${formatPrice(cancelling.limitPrice, market)}` : ''} footer={<><Button disabled={processing} onClick={() => setCancelling(null)} variant="ghost">Keep order</Button><Button disabled={processing} onClick={confirmCancel} variant="danger">{processing ? 'Cancelling…' : 'Cancel order'}</Button></>} isOpen={Boolean(cancelling)} onClose={() => !processing && setCancelling(null)} title="Cancel pending order">{error ? <p className="text-sm text-negative">{error}</p> : <p className="text-sm leading-6 text-muted">The order will remain in Firestore history with a cancelled status.</p>}</Modal></Card>
}

export default PendingOrders
