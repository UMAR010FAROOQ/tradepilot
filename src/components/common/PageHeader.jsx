import { cn } from '../../utils/cn.js'

function PageHeader({ eyebrow, title, description, actions, titleClassName }) {
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
            {eyebrow}
          </p>
        )}
        <h1 className={cn('text-2xl font-semibold tracking-tight text-foreground sm:text-3xl', titleClassName)}>
          {title}
        </h1>
        {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}

export default PageHeader
