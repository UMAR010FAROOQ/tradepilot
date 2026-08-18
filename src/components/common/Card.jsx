import { cn } from '../../utils/cn.js'

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

function Card({ children, className, padding = 'md', elevated = false, ...props }) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border bg-surface',
        elevated && 'bg-elevated shadow-panel',
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}

export default Card
