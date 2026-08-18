import { useId } from 'react'
import { cn } from '../../utils/cn.js'

function Input({ id, label, hint, error, className, inputClassName, ...props }) {
  const generatedId = useId()
  const inputId = id || generatedId

  return (
    <div className={cn('grid gap-1.5', className)}>
      {label && (
        <label className="text-xs font-medium text-foreground" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'h-10 w-full rounded-lg border border-border bg-elevated px-3 text-sm text-foreground placeholder:text-muted/70 transition hover:border-muted/60 focus:border-accent focus:outline-none',
          error && 'border-negative focus:border-negative',
          inputClassName,
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? `${inputId}-description` : undefined}
        {...props}
      />
      {(hint || error) && (
        <p
          id={`${inputId}-description`}
          className={cn('text-xs text-muted', error && 'text-negative')}
        >
          {error || hint}
        </p>
      )}
    </div>
  )
}

export default Input
