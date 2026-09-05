import { useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import { TRADING_FEE_RATE } from '../../constants/trading.js'
import { formatCurrency } from '../../utils/formatCurrency.js'
import Button from '../common/Button.jsx'
import Input from '../common/Input.jsx'
import Modal from '../common/Modal.jsx'

function number(value) { const resolved = Number(value); return Number.isFinite(resolved) && resolved > 0 ? resolved : null }

function TradingCalculator({ defaultEntry, walletBalance }) {
  const [open, setOpen] = useState(false)
  const [entry, setEntry] = useState('')
  const [exit, setExit] = useState('')
  const [quantity, setQuantity] = useState('')
  const [riskPercent, setRiskPercent] = useState('2')
  const [stopLoss, setStopLoss] = useState('')
  const values = useMemo(() => {
    const entryPrice = number(entry), exitPrice = number(exit), qty = number(quantity), risk = number(riskPercent), stop = number(stopLoss)
    const grossEntry = entryPrice && qty ? entryPrice * qty : null
    const grossExit = exitPrice && qty ? exitPrice * qty : null
    const entryFee = grossEntry === null ? null : grossEntry * TRADING_FEE_RATE
    const exitFee = grossExit === null ? null : grossExit * TRADING_FEE_RATE
    const netPnl = grossEntry !== null && grossExit !== null ? grossExit - grossEntry - entryFee - exitFee : null
    const cost = grossEntry === null ? null : grossEntry + entryFee
    const riskAmount = risk && walletBalance ? walletBalance * risk / 100 : null
    const riskPerUnit = entryPrice && stop && stop < entryPrice ? entryPrice - stop : null
    const suggested = riskAmount && riskPerUnit ? riskAmount / riskPerUnit : null
    return { grossEntry, grossExit, entryFee, exitFee, netPnl, pnlPercent: grossEntry && netPnl !== null ? netPnl / grossEntry * 100 : null, returnOnCost: cost && netPnl !== null ? netPnl / cost * 100 : null, riskAmount, riskPerUnit, suggested, estimatedCost: suggested && entryPrice ? suggested * entryPrice * (1 + TRADING_FEE_RATE) : null }
  }, [entry, exit, quantity, riskPercent, stopLoss, walletBalance])
  const money = (value) => value === null ? '—' : formatCurrency(value)
  return <><Button onClick={() => { setEntry(defaultEntry ? String(defaultEntry) : ''); setOpen(true) }} size="sm" variant="secondary"><Calculator className="size-4" />Calculator</Button><Modal footer={<Button onClick={() => setOpen(false)} variant="secondary">Done</Button>} isOpen={open} onClose={() => setOpen(false)} title="Trading Calculator"><div className="space-y-6"><section><h3 className="text-xs font-semibold">Long Trade Estimate</h3><p className="mt-1 text-[10px] text-muted">Side: BUY / Long · Simulation only</p><div className="mt-3 grid grid-cols-2 gap-3"><Input label="Entry price" min="0" onChange={(event) => setEntry(event.target.value)} step="any" type="number" value={entry} /><Input label="Exit price" min="0" onChange={(event) => setExit(event.target.value)} step="any" type="number" value={exit} /><Input className="col-span-2" label="Quantity" min="0" onChange={(event) => setQuantity(event.target.value)} step="any" type="number" value={quantity} /></div><dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-surface p-4 text-xs">{[['Gross entry', money(values.grossEntry)], ['Gross exit', money(values.grossExit)], ['Entry fee', money(values.entryFee)], ['Exit fee', money(values.exitFee)], ['Estimated net P/L', money(values.netPnl)], ['P/L %', values.pnlPercent === null ? '—' : `${values.pnlPercent.toFixed(2)}%`], ['Return on cost', values.returnOnCost === null ? '—' : `${values.returnOnCost.toFixed(2)}%`]].map(([label, value]) => <div key={label}><dt className="text-muted">{label}</dt><dd className="financial-value mt-1 font-semibold">{value}</dd></div>)}</dl></section><section className="border-t border-border pt-5"><h3 className="text-xs font-semibold">Risk Calculator</h3><div className="mt-3 grid grid-cols-2 gap-3"><Input disabled label="Wallet balance" value={walletBalance ? String(walletBalance) : ''} /><Input label="Risk %" max="100" min="0" onChange={(event) => setRiskPercent(event.target.value)} step="any" type="number" value={riskPercent} /><Input label="Entry" min="0" onChange={(event) => setEntry(event.target.value)} step="any" type="number" value={entry} /><Input label="Stop loss" min="0" onChange={(event) => setStopLoss(event.target.value)} step="any" type="number" value={stopLoss} /></div><dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-surface p-4 text-xs">{[['Risk amount', money(values.riskAmount)], ['Risk per unit', money(values.riskPerUnit)], ['Suggested quantity', values.suggested?.toFixed(8) || '—'], ['Estimated position cost', money(values.estimatedCost)]].map(([label, value]) => <div key={label}><dt className="text-muted">{label}</dt><dd className="financial-value mt-1 font-semibold">{value}</dd></div>)}</dl><p className="mt-3 text-[10px] text-muted">Simulation sizing tool. This is not financial advice.</p></section></div></Modal></>
}

export default TradingCalculator
