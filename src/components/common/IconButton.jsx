import { LoaderCircle } from 'lucide-react'
import { cn } from '../../utils/cn.js'

const variants = {
  default: 'text-muted hover:bg-elevated hover:text-foreground focus-visible:text-foreground',
  ghost: 'text-foreground/80 hover:bg-elevated hover:text-foreground',
  danger: 'text-negative hover:bg-negative/12 hover:text-negative focus-visible:bg-negative/12',
  success: 'text-positive hover:bg-positive/12 hover:text-positive focus-visible:bg-positive/12',
}

const sizes = { sm: 'size-8', md: 'size-9', lg: 'size-10' }

function IconButton({ icon: Icon, 'aria-label': ariaLabel, title, disabled, loading = false, size = 'md', variant = 'default', className, ...props }) {
  return <button aria-label={ariaLabel} className={cn('inline-grid shrink-0 cursor-pointer place-items-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-45', sizes[size], variants[variant], className)} disabled={disabled || loading} title={title || ariaLabel} type="button" {...props}>{loading ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Icon aria-hidden="true" className="size-4" />}</button>
}

export default IconButton
