import { formatCurrency } from '../../utils/formatCurrency.js'

function PerformanceChart({ data }) {
  if (data.length === 0) return <div className="grid h-64 place-items-center px-6 text-center text-sm text-muted">Close a simulated position to begin cumulative realized P/L history.</div>
  const width = 800; const height = 260; const padding = 30
  const values = data.map((point) => point.value)
  const min = Math.min(0, ...values); const max = Math.max(0, ...values); const range = max - min || 1
  const x = (index) => data.length === 1 ? width / 2 : padding + (index / (data.length - 1)) * (width - padding * 2)
  const y = (value) => padding + ((max - value) / range) * (height - padding * 2)
  const path = data.map((point, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(point.value)}`).join(' ')
  const zeroY = y(0)

  return <div className="p-5"><div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs text-muted">Cumulative realized P/L</p><p className={`financial-value mt-1 text-xl font-semibold ${data.at(-1).value >= 0 ? 'text-positive' : 'text-negative'}`}>{formatCurrency(data.at(-1).value)}</p></div><p className="text-xs text-muted">{data.length} closing trade{data.length === 1 ? '' : 's'}</p></div><svg aria-label={`Cumulative realized profit and loss ending at ${formatCurrency(data.at(-1).value)}`} className="h-64 w-full overflow-visible" preserveAspectRatio="none" role="img" viewBox={`0 0 ${width} ${height}`}><line className="text-border" stroke="currentColor" strokeDasharray="5 5" x1={padding} x2={width - padding} y1={zeroY} y2={zeroY} /><path className={data.at(-1).value >= 0 ? 'text-positive' : 'text-negative'} d={path} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" />{data.map((point, index) => <circle className={point.value >= 0 ? 'fill-positive' : 'fill-negative'} cx={x(index)} cy={y(point.value)} key={point.id} r="4"><title>{`${point.time.toLocaleDateString()}: ${formatCurrency(point.value)}`}</title></circle>)}</svg></div>
}
export default PerformanceChart
