import { cn } from '../../utils/cn.js'

const variants = {
  positive: 'bg-positive/10 text-positive ring-positive/20',
  negative: 'bg-negative/10 text-negative ring-negative/20',
  warning: 'bg-warning/10 text-warning ring-warning/20',
  neutral: 'bg-muted/10 text-muted ring-border',
}

function Badge({ children, className, variant = 'neutral' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

export default Badge
