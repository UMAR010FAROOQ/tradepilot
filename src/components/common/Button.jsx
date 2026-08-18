import { cn } from '../../utils/cn.js'

const variants = {
  primary: 'bg-accent text-white hover:bg-accent-strong',
  secondary: 'border border-border bg-elevated text-foreground hover:bg-border',
  ghost: 'bg-transparent text-muted hover:bg-elevated hover:text-foreground',
  success: 'bg-positive text-canvas hover:brightness-110',
  danger: 'bg-negative text-white hover:brightness-110',
}

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-sm',
}

function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
