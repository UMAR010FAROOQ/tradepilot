import { LoaderCircle } from 'lucide-react'
import { cn } from '../../utils/cn.js'

const variants = {
  default: 'text-muted hover:bg-elevated hover:text-foreground focus-visible:text-foreground',
  ghost: 'text-foreground/80 hover:bg-elevated hover:text-foreground',
  danger: 'text-negative hover:bg-negative/12 hover:text-negative focus-visible:bg-negative/12',
  success: 'text-positive hover:bg-positive/12 hover:text-positive focus-visible:bg-positive/12',
  prominent: 'border border-accent/45 bg-elevated text-foreground shadow-[0_0_18px_rgb(59_130_246_/_0.12)] hover:border-accent hover:bg-accent/15 hover:text-accent',
  'prominent-active': 'border border-accent bg-accent text-white shadow-[0_0_18px_rgb(59_130_246_/_0.2)] hover:bg-accent-strong',
  close: 'border border-border bg-elevated text-foreground shadow-sm hover:border-negative/50 hover:bg-negative/12 hover:text-negative',
}

const sizes = { sm: 'size-8', md: 'size-9', lg: 'size-10' }
const iconSizes = { sm: 'size-4', md: 'size-5', lg: 'size-[22px]' }

function IconButton({ icon: Icon, iconSize = 'md', children, 'aria-label': ariaLabel, title, disabled, loading = false, size = 'md', variant = 'default', className, ...props }) {
  return <button aria-label={ariaLabel} className={cn('relative inline-grid shrink-0 cursor-pointer place-items-center rounded-lg outline-none transition disabled:cursor-not-allowed disabled:opacity-45 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas', sizes[size], variants[variant], className)} disabled={disabled || loading} title={title || ariaLabel} type="button" {...props}>{loading ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Icon aria-hidden="true" className={iconSizes[iconSize]} strokeWidth={2.4} />}{children}</button>
}

export default IconButton
