import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../utils/cn.js'

function Input({ id, label, hint, error, className, inputClassName, type = 'text', ...props }) {
  const generatedId = useId()
  const inputId = id || generatedId
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const isPasswordField = type === 'password'

  return (
    <div className={cn('grid gap-1.5', className)}>
      {label && (
        <label className="text-xs font-medium text-foreground" htmlFor={inputId}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={cn(
            'h-10 w-full rounded-lg border border-border bg-elevated px-3 text-sm text-foreground placeholder:text-muted/70 transition hover:border-muted/60 focus:border-accent focus:outline-none',
            isPasswordField && 'pr-10',
            error && 'border-negative focus:border-negative',
            inputClassName,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={hint || error ? `${inputId}-description` : undefined}
          type={isPasswordField && isPasswordVisible ? 'text' : type}
          {...props}
        />
        {isPasswordField && (
          <button
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            aria-pressed={isPasswordVisible}
            className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-muted transition hover:bg-surface hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={props.disabled}
            onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
            type="button"
          >
            {isPasswordVisible ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </button>
        )}
      </div>
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
