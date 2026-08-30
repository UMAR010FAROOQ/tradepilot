import { forwardRef, useId } from 'react'
import { cn } from '../../utils/cn.js'

const Textarea = forwardRef(function Textarea({ className, error, id, label, ...props }, ref) {
  const generatedId = useId()
  const resolvedId = id || generatedId
  return <div className="grid gap-2">
    {label && <label className="text-xs font-semibold text-foreground" htmlFor={resolvedId}>{label}</label>}
    <textarea className={cn('min-h-24 w-full resize-y rounded-lg border border-border bg-elevated px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15', error && 'border-negative', className)} id={resolvedId} ref={ref} {...props} />
    {error && <p className="text-xs text-negative">{error}</p>}
  </div>
})

export default Textarea
