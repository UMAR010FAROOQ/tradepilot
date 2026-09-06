import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react'
import Badge from '../components/common/Badge.jsx'
import Button from '../components/common/Button.jsx'
import Card from '../components/common/Card.jsx'
import Input from '../components/common/Input.jsx'
import PageHeader from '../components/common/PageHeader.jsx'
import useAuth from '../hooks/useAuth.js'
import useRisk from '../hooks/useRisk.js'
import { saveRiskSettings, utcDayStart } from '../services/riskService.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { getFirestoreErrorMessage } from '../utils/firestoreErrors.js'
import { calculatePositionPnl } from '../utils/pnl.js'

const assetClassFor = (position) => position.symbol === 'XAUUSD' ? 'Gold' : position.marketType === 'crypto' ? 'Crypto' : 'Forex'

function RiskManagement() {
  const { currentUser } = useAuth()
  const { settings, positions, trades, wallet, prices } = useRisk()
  const dashboard = useMemo(() => {
    const rows = positions.filter((item) => item.status === 'open' && item.quantity > 0).map((position) => {
      const valuation = calculatePositionPnl(position, prices.get(position.symbol))
      return { ...position, ...valuation, assetClass: assetClassFor(position) }
    })
    const totalExposure = rows.reduce((sum, row) => sum + (row.marketValue || 0), 0)
    const unrealizedPnl = rows.reduce((sum, row) => sum + (row.unrealizedPnl || 0), 0)
    const equity = (wallet?.availableBalance || 0) + totalExposure
    const todayRealizedPnl = trades.filter((trade) => trade.side === 'SELL' && trade.status === 'filled' && trade.createdAt?.toDate?.() >= utcDayStart()).reduce((sum, trade) => sum + (Number(trade.realizedPnl) || 0), 0)
    const dailyLossUsed = Math.max(0, -todayRealizedPnl)
    const dailyLossLimit = equity * (settings?.dailyLossLimitPercent || 0) / 100
    const exposureByClass = [...rows.reduce((map, row) => map.set(row.assetClass, (map.get(row.assetClass) || 0) + (row.marketValue || 0)), new Map()).entries()]
    return { rows, totalExposure, unrealizedPnl, equity, todayRealizedPnl, dailyLossUsed, dailyLossLimit, exposureByClass }
  }, [positions, prices, settings?.dailyLossLimitPercent, trades, wallet?.availableBalance])

  const largest = [...dashboard.rows].sort((a, b) => (b.marketValue || 0) - (a.marketValue || 0))[0]
  const largestGain = [...dashboard.rows].sort((a, b) => (b.unrealizedPnl || 0) - (a.unrealizedPnl || 0))[0]
  const largestLoss = [...dashboard.rows].sort((a, b) => (a.unrealizedPnl || 0) - (b.unrealizedPnl || 0))[0]

  return <div className="space-y-6">
    <PageHeader description="Set account-level guardrails for simulated BUY orders and review live exposure." eyebrow="Capital protection" title="Risk management" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Account equity', formatCurrency(dashboard.equity)], ['Open exposure', formatCurrency(dashboard.totalExposure)],
        ['Today realized P/L', formatCurrency(dashboard.todayRealizedPnl)], ['Today unrealized P/L', formatCurrency(dashboard.unrealizedPnl)],
        ['Daily loss used', formatCurrency(dashboard.dailyLossUsed)], ['Open positions', dashboard.rows.length],
        ['Available cash', formatCurrency(wallet?.availableBalance || 0)], ['Largest position', largest ? `${largest.symbol} · ${formatCurrency(largest.marketValue)}` : 'Unavailable'],
        ['Largest current gain', largestGain && largestGain.unrealizedPnl > 0 ? `${largestGain.symbol} · ${formatCurrency(largestGain.unrealizedPnl)}` : 'Unavailable'], ['Largest current loss', largestLoss && largestLoss.unrealizedPnl < 0 ? `${largestLoss.symbol} · ${formatCurrency(largestLoss.unrealizedPnl)}` : 'Unavailable'],
      ].map(([label, value]) => <Card key={label}><p className="text-xs text-muted">{label}</p><p className="financial-value mt-3 text-xl font-semibold">{value}</p></Card>)}
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.2fr)]">
      <Card>
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold">Risk protection</h2><p className="mt-1 text-xs leading-5 text-muted">Checked before every BUY submission and again before a pending BUY fills.</p></div><Badge variant={settings?.riskProtectionEnabled ? 'positive' : 'warning'}>{settings?.riskProtectionEnabled ? 'Active' : 'Off'}</Badge></div>
        {settings ? <RiskSettingsForm key={settings.updatedAt?.toMillis?.() || 'defaults'} settings={settings} userId={currentUser.uid} /> : <div className="mt-5 h-64 animate-pulse rounded-lg bg-elevated" />}
      </Card>
      <div className="space-y-4">
        <Card>
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold">Daily loss capacity</h2><p className="mt-1 text-xs text-muted">UTC day · realized SELL outcomes only</p></div>{dashboard.dailyLossUsed >= dashboard.dailyLossLimit && dashboard.dailyLossLimit > 0 ? <ShieldAlert className="size-5 text-negative" /> : <ShieldCheck className="size-5 text-positive" />}</div>
          <div className="mt-5 grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-muted">Used</p><p className="financial-value mt-1 text-lg font-semibold">{formatCurrency(dashboard.dailyLossUsed)}</p><p className="financial-value mt-1 text-[10px] text-muted">{dashboard.dailyLossLimit ? Math.min(100, dashboard.dailyLossUsed / dashboard.dailyLossLimit * 100).toFixed(1) : '0.0'}%</p></div><div><p className="text-xs text-muted">Limit</p><p className="financial-value mt-1 text-lg font-semibold">{formatCurrency(dashboard.dailyLossLimit)}</p></div><div><p className="text-xs text-muted">Remaining</p><p className="financial-value mt-1 text-lg font-semibold">{formatCurrency(Math.max(0, dashboard.dailyLossLimit - dashboard.dailyLossUsed))}</p></div></div>
        </Card>
        <Card padding="none"><div className="border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Exposure by asset class</h2><p className="mt-1 text-xs text-muted">Live position value; fallback to entry value if a quote is unavailable.</p></div>{dashboard.exposureByClass.length ? <dl className="divide-y divide-border">{dashboard.exposureByClass.map(([label, value]) => <div className="flex items-center justify-between px-5 py-4" key={label}><dt className="text-sm font-medium">{label}</dt><dd className="text-right"><span className="financial-value block text-sm font-semibold">{formatCurrency(value)}</span><span className="financial-value text-xs text-muted">{dashboard.equity ? (value / dashboard.equity * 100).toFixed(2) : '0.00'}% of equity</span></dd></div>)}</dl> : <p className="p-8 text-center text-sm text-muted">No open exposure.</p>}</Card>
        <Card><h2 className="text-sm font-semibold">Concentration snapshot</h2><p className="mt-3 text-xs text-muted">Largest position</p><p className="mt-1 text-sm font-semibold">{largest ? `${largest.symbol} · ${formatCurrency(largest.marketValue)}` : 'No open positions'}</p><p className="mt-3 text-xs text-muted">Available cash</p><p className="financial-value mt-1 text-sm font-semibold">{formatCurrency(wallet?.availableBalance || 0)}</p></Card>
      </div>
    </div>
    <Card padding="none"><div className="border-b border-border px-5 py-4"><h2 className="text-sm font-semibold">Open-position exposure</h2></div>{dashboard.rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-border bg-elevated/40 text-[10px] uppercase tracking-wider text-muted"><tr><th className="px-5 py-3">Market</th><th className="px-5 py-3">Class</th><th className="px-5 py-3">Market value</th><th className="px-5 py-3">Equity share</th><th className="px-5 py-3">Unrealized P/L</th></tr></thead><tbody className="divide-y divide-border">{dashboard.rows.map((row) => <tr key={row.id}><td className="px-5 py-4 text-sm font-semibold">{row.symbol}</td><td className="px-5 py-4 text-sm text-muted">{row.assetClass}</td><td className="financial-value px-5 py-4 text-sm">{formatCurrency(row.marketValue)}</td><td className="financial-value px-5 py-4 text-sm">{dashboard.equity ? (row.marketValue / dashboard.equity * 100).toFixed(2) : '0.00'}%</td><td className={`financial-value px-5 py-4 text-sm ${(row.unrealizedPnl || 0) >= 0 ? 'text-positive' : 'text-negative'}`}>{formatCurrency(row.unrealizedPnl)}</td></tr>)}</tbody></table></div> : <p className="p-8 text-center text-sm text-muted">No open positions.</p>}</Card>
  </div>
}

function RiskSettingsForm({ settings, userId }) {
  const [form, setForm] = useState({ ...settings })
  const [status, setStatus] = useState({ saving: false, error: '', success: '' })
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  const handleSave = async (event) => {
    event.preventDefault(); setStatus({ saving: true, error: '', success: '' })
    try { await saveRiskSettings(userId, form); setStatus({ saving: false, error: '', success: 'Risk controls saved.' }) }
    catch (error) { setStatus({ saving: false, error: getFirestoreErrorMessage(error), success: '' }) }
  }
  return <form className="mt-5 space-y-4" onSubmit={handleSave}><label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-elevated/40 p-3"><input checked={Boolean(form.riskProtectionEnabled)} className="mt-0.5 size-4 accent-blue-500" onChange={(event) => setForm((current) => ({ ...current, riskProtectionEnabled: event.target.checked }))} type="checkbox" /><span><span className="block text-sm font-semibold">Enforce protection</span><span className="mt-1 block text-xs text-muted">Disabling this allows BUY orders without these account guardrails.</span></span></label><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><Input hint="Limits estimated loss at the configured Stop Loss." label="Maximum trade risk (%)" max="20" min="0.1" onChange={update('maxTradeRiskPercent')} required step="0.1" type="number" value={form.maxTradeRiskPercent} /><Input hint="Limits one market's value relative to current equity." label="Maximum position size (%)" max="100" min="1" onChange={update('maxPositionPercent')} required step="0.1" type="number" value={form.maxPositionPercent} /><Input hint="Blocks new BUYs after the UTC realized-loss threshold." label="Daily realized loss limit (%)" max="50" min="1" onChange={update('dailyLossLimitPercent')} required step="0.1" type="number" value={form.dailyLossLimitPercent} /><Input hint="Limits simultaneous open markets, not add-ons." label="Maximum open positions" max="20" min="1" onChange={update('maxOpenPositions')} required step="1" type="number" value={form.maxOpenPositions} /></div>{status.error && <p className="flex gap-2 text-xs text-negative" role="alert"><AlertTriangle className="size-4 shrink-0" />{status.error}</p>}{status.success && <p className="flex gap-2 text-xs text-positive" role="status"><CheckCircle2 className="size-4 shrink-0" />{status.success}</p>}<Button disabled={status.saving} type="submit">{status.saving ? 'Saving…' : 'Save risk controls'}</Button></form>
}

export default RiskManagement
