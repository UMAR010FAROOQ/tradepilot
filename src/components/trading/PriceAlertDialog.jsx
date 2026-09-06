import { useState } from 'react'
import { createPriceAlert } from '../../services/priceAlertService.js'
import { getFirestoreErrorMessage } from '../../utils/firestoreErrors.js'
import { formatPrice } from '../../utils/marketFormatters.js'
import Button from '../common/Button.jsx'
import Input from '../common/Input.jsx'
import Modal from '../common/Modal.jsx'

function PriceAlertDialog({ market, currentPrice, initialCondition = 'above', initialTarget = '', userId, onClose, onCreated }) {
  const [condition, setCondition] = useState(initialCondition), [target, setTarget] = useState(initialTarget), [processing, setProcessing] = useState(false), [error, setError] = useState('')
  const submit = async () => { setProcessing(true); setError(''); try { await createPriceAlert({ userId, symbol: market.symbol, condition, targetPrice: target }); onCreated?.(); onClose() } catch (requestError) { setError(getFirestoreErrorMessage(requestError)) } finally { setProcessing(false) } }
  return <Modal description={`Current price: ${formatPrice(currentPrice, market)}`} footer={<><Button disabled={processing} onClick={onClose} variant="ghost">Cancel</Button><Button disabled={processing} onClick={submit}>{processing ? 'Creating…' : 'Create Alert'}</Button></>} isOpen onClose={() => !processing && onClose()} title={`New ${market.displaySymbol} Alert`}><div className="space-y-4"><div className="grid grid-cols-2 gap-2">{['above', 'below'].map((value) => <button aria-pressed={condition === value} className={`h-10 rounded-lg border text-xs font-semibold ${condition === value ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted'}`} key={value} onClick={() => setCondition(value)} type="button">Price {value === 'above' ? 'Above' : 'Below'}</button>)}</div><Input label="Target price" min="0" onChange={(event) => setTarget(event.target.value)} step="any" type="number" value={target} />{error && <p className="text-xs text-negative" role="alert">{error}</p>}<p className="text-[10px] text-muted">Review the condition and target. The scanner never creates alerts automatically.</p></div></Modal>
}
export default PriceAlertDialog
