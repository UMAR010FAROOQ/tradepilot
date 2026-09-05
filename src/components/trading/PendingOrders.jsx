import { useMemo, useState } from 'react'
import { Check, Clipboard, Clock3, Eye, Pencil, XCircle } from 'lucide-react'
import { cancelPendingOrder, editPendingOrder } from '../../services/orderService.js'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'
import { formatPrice } from '../../utils/marketFormatters.js'
import Button from '../common/Button.jsx'
import Card from '../common/Card.jsx'
import Input from '../common/Input.jsx'
import Modal from '../common/Modal.jsx'

const formatDate = (timestamp) => timestamp?.toDate?.().toLocaleString() || 'Pending timestamp'

function PendingOrders({ market, onComplete, orders, userId }) {
  const [tab, setTab] = useState('open')
  const [selected, setSelected] = useState(null)
  const [dialog, setDialog] = useState('')
  const [form, setForm] = useState({ quantity: '', limitPrice: '', stopLoss: '', takeProfit: '' })
  const [processing, setProcessing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const openOrders = useMemo(() => orders.filter((order) => order.status === 'pending'), [orders])
  const visibleOrders = tab === 'open' ? openOrders : orders

  const openDialog = (type, order) => {
    setSelected(order); setDialog(type); setError(''); setCopied(false)
    setForm({ quantity: String(order.quantity), limitPrice: String(order.limitPrice), stopLoss: order.stopLoss?.toString() || '', takeProfit: order.takeProfit?.toString() || '' })
  }
  const confirmCancel = async () => {
    setProcessing(true); setError('')
    try { await cancelPendingOrder(userId, selected.id); setDialog(''); onComplete?.('Pending order cancelled.') }
    catch (requestError) { setError(getFirestoreErrorMessage(requestError)) } finally { setProcessing(false) }
  }
  const saveEdit = async () => {
    setProcessing(true); setError('')
    try { await editPendingOrder({ userId, orderId: selected.id, ...form }); setDialog(''); onComplete?.('Pending order updated.') }
    catch (requestError) { setError(getFirestoreErrorMessage(requestError)) } finally { setProcessing(false) }
  }
  const copyId = async () => {
    try { await navigator.clipboard.writeText(selected.id); setCopied(true) } catch { setError('Order ID could not be copied.') }
  }

  return <Card padding="none">
    <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Clock3 className="size-4 text-warning" /><h2 className="text-sm font-semibold">Order management</h2>{openOrders.length > 0 && <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">{openOrders.length} open</span>}</div><div className="flex rounded-lg bg-elevated p-1" role="tablist">{[['open', 'Open Orders'], ['history', 'Order History']].map(([value, label]) => <button aria-selected={tab === value} className={`h-8 rounded-md px-3 text-xs font-semibold ${tab === value ? 'bg-accent text-white' : 'text-muted hover:text-foreground'}`} key={value} onClick={() => setTab(value)} role="tab" type="button">{label}</button>)}</div></div>
    {visibleOrders.length ? <div className="overflow-x-auto"><table className="w-full min-w-[940px] text-left text-xs"><thead className="bg-elevated/40 text-[10px] uppercase tracking-wider text-muted"><tr>{['Side', 'Type', 'Quantity', 'Limit', 'SL', 'TP', 'Status', 'Created', 'Actions'].map((label) => <th className="px-4 py-3" key={label}>{label}</th>)}</tr></thead><tbody className="divide-y divide-border">{visibleOrders.map((order) => <tr key={order.id}><td className={`px-4 py-3 font-bold ${order.side === 'SELL' ? 'text-negative' : 'text-positive'}`}>{order.side}{order.side === 'SELL' && <span className="ml-1 text-[9px] text-muted">REDUCE ONLY</span>}</td><td className="px-4 py-3">Limit</td><td className="financial-value px-4 py-3">{order.quantity}</td><td className="financial-value px-4 py-3">{formatPrice(order.limitPrice, market)}</td><td className="financial-value px-4 py-3">{order.stopLoss ? formatPrice(order.stopLoss, market) : '—'}</td><td className="financial-value px-4 py-3">{order.takeProfit ? formatPrice(order.takeProfit, market) : '—'}</td><td className="px-4 py-3 capitalize">{order.status}</td><td className="px-4 py-3 text-muted">{formatDate(order.createdAt)}</td><td className="px-4 py-3"><div className="flex gap-1"><Button aria-label="View order details" onClick={() => openDialog('details', order)} size="sm" variant="ghost"><Eye className="size-4" /></Button>{order.status === 'pending' && <><Button aria-label="Edit order" onClick={() => openDialog('edit', order)} size="sm" variant="ghost"><Pencil className="size-4" /></Button><Button aria-label="Cancel order" onClick={() => openDialog('cancel', order)} size="sm" variant="ghost"><XCircle className="size-4" /></Button></>}</div></td></tr>)}</tbody></table></div> : <div className="p-8 text-center text-xs text-muted">{tab === 'open' ? `No open orders for ${market.displaySymbol}.` : `No order history for ${market.displaySymbol}.`}</div>}
    <p className="border-t border-border px-5 py-3 text-[10px] text-muted">Pending simulated orders are evaluated while TradePilot is open.</p>
    <Modal description={selected ? `${market.displaySymbol} ${selected.side} limit order` : ''} footer={<><Button disabled={processing} onClick={() => setDialog('')} variant="ghost">Keep order</Button><Button disabled={processing} onClick={confirmCancel} variant="danger">{processing ? 'Cancelling…' : 'Cancel order'}</Button></>} isOpen={dialog === 'cancel'} onClose={() => !processing && setDialog('')} title="Cancel pending order">{error ? <p className="text-sm text-negative">{error}</p> : <p className="text-sm leading-6 text-muted">The order remains in history with a cancelled status.</p>}</Modal>
    <Modal description={selected ? `${selected.side} Limit · ${selected.side === 'SELL' ? 'Reduce Only' : 'Long'}` : ''} footer={<><Button disabled={processing} onClick={() => setDialog('')} variant="ghost">Cancel</Button><Button disabled={processing} onClick={saveEdit}>{processing ? 'Saving…' : 'Save changes'}</Button></>} isOpen={dialog === 'edit'} onClose={() => !processing && setDialog('')} title="Edit Pending Order"><div className="space-y-4"><Input label="Quantity" min="0" onChange={(event) => setForm((value) => ({ ...value, quantity: event.target.value }))} step="any" type="number" value={form.quantity} /><Input label="Limit price" min="0" onChange={(event) => setForm((value) => ({ ...value, limitPrice: event.target.value }))} step="any" type="number" value={form.limitPrice} />{selected?.side !== 'SELL' && <div className="grid grid-cols-2 gap-3"><Input label="Stop loss" min="0" onChange={(event) => setForm((value) => ({ ...value, stopLoss: event.target.value }))} step="any" type="number" value={form.stopLoss} /><Input label="Take profit" min="0" onChange={(event) => setForm((value) => ({ ...value, takeProfit: event.target.value }))} step="any" type="number" value={form.takeProfit} /></div>}{error && <p className="text-xs text-negative">{error}</p>}</div></Modal>
    <Modal footer={<Button onClick={() => setDialog('')} variant="secondary">Close</Button>} isOpen={dialog === 'details'} onClose={() => setDialog('')} title="Order Details">{selected && <div className="space-y-4"><div className="flex items-center justify-between gap-3 rounded-lg bg-surface p-3"><code className="min-w-0 truncate text-xs text-muted">{selected.id}</code><Button onClick={copyId} size="sm" variant="ghost">{copied ? <Check className="size-4 text-positive" /> : <Clipboard className="size-4" />}{copied ? 'Copied' : 'Copy ID'}</Button></div><dl className="grid grid-cols-2 gap-4 text-sm">{[['Symbol', market.displaySymbol], ['Market', market.name], ['Side', selected.side], ['Order type', 'Limit'], ['Quantity', selected.quantity], ['Limit price', formatPrice(selected.limitPrice, market)], ['Reduce only', selected.reduceOnly === true ? 'Yes' : 'No'], ['Stop loss', selected.stopLoss ? formatPrice(selected.stopLoss, market) : '—'], ['Take profit', selected.takeProfit ? formatPrice(selected.takeProfit, market) : '—'], ['Status', selected.status], ['Created', formatDate(selected.createdAt)], ['Filled at', formatDate(selected.filledAt)], ['Filled price', selected.filledPrice ? formatPrice(selected.filledPrice, market) : '—'], ['Cancelled at', formatDate(selected.cancelledAt)]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted">{label}</dt><dd className="financial-value mt-1 break-words">{value}</dd></div>)}</dl>{error && <p className="text-xs text-negative">{error}</p>}</div>}</Modal>
  </Card>
}

export default PendingOrders
