import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../utils/cn.js'
import { formatPercent } from '../../utils/marketFormatters.js'

function PriceChange({ value, amount, showAmount = false, className }) {
  if (!Number.isFinite(value)) return <span className={cn('financial-value text-xs font-semibold text-muted', className)}>N/A</span>
  const positive = value >= 0
  const Icon = positive ? ArrowUpRight : ArrowDownRight
  return <span className={cn('financial-value inline-flex items-center gap-1 text-xs font-semibold', positive ? 'text-positive' : 'text-negative', className)}><Icon aria-hidden="true" className="size-3.5" />{showAmount && Number.isFinite(amount) ? `${amount >= 0 ? '+' : ''}${amount.toFixed(4)} · ` : ''}{formatPercent(value)}</span>
}

export default PriceChange
