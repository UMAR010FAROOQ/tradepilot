import { ChevronDown } from 'lucide-react'
import { useId } from 'react'
import { cn } from '../../utils/cn.js'

function Select({ id, label, hint, error, children, className, ...props }) {
  const generatedId = useId()
  const selectId = id || generatedId

  return (
    <div className={cn('grid gap-1.5', className)}>
      {label && (
        <label className="text-xs font-medium text-foreground" htmlFor={selectId}>
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            'h-10 w-full appearance-none rounded-lg border border-border bg-elevated px-3 pr-9 text-sm text-foreground transition hover:border-muted/60 focus:border-accent focus:outline-none',
            error && 'border-negative focus:border-negative',
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={hint || error ? `${selectId}-description` : undefined}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        />
      </div>
      {(hint || error) && (
        <p
          id={`${selectId}-description`}
          className={cn('text-xs text-muted', error && 'text-negative')}
        >
          {error || hint}
        </p>
      )}
    </div>
  )
}

export default Select
