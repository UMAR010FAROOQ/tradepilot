import { formatCurrency } from '../../utils/formatCurrency.js'

function BacktestEquityChart({ data }) {
  if (!data.length) return <div className="grid h-72 place-items-center text-sm text-muted">Run a backtest to build an equity curve.</div>
  const width = 900, height = 280, padding = 28, values = data.map((point) => point.value), min = Math.min(...values), max = Math.max(...values), range = max - min || 1
  const x = (index) => padding + index / Math.max(1, data.length - 1) * (width - padding * 2), y = (value) => padding + (max - value) / range * (height - padding * 2)
  const path = data.map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point.value)}`).join(' ')
  return <div className="p-5"><div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs text-muted">Backtest Equity Curve</p><p className={`financial-value mt-1 text-xl font-semibold ${data.at(-1).value >= data[0].value ? 'text-positive' : 'text-negative'}`}>{formatCurrency(data.at(-1).value)}</p></div><p className="text-xs text-muted">{data.length} candles</p></div><svg aria-label={`Backtest equity ending at ${formatCurrency(data.at(-1).value)}`} className="h-64 w-full" preserveAspectRatio="none" role="img" viewBox={`0 0 ${width} ${height}`}><path className={data.at(-1).value >= data[0].value ? 'text-positive' : 'text-negative'} d={path} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg></div>
}
export default BacktestEquityChart
