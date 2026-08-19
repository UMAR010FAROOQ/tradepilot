import { CircleAlert, Inbox } from 'lucide-react'

export function AdminError({ message }) {
  if (!message) return null
  return <div className="flex gap-2.5 rounded-lg border border-negative/25 bg-negative/10 p-3 text-sm text-negative" role="alert"><CircleAlert className="mt-0.5 size-4 shrink-0" /><p>{message}</p></div>
}

export function AdminLoading() {
  return <div className="grid gap-3 p-5" role="status" aria-label="Loading data">{[1, 2, 3, 4].map((item) => <span className="h-14 animate-pulse rounded-lg bg-elevated" key={item} />)}</div>
}

export function AdminEmpty({ title = 'No records found', description = 'Records will appear here when available.' }) {
  return <div className="grid min-h-56 place-items-center p-8 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-xl bg-elevated text-muted"><Inbox className="size-5" /></span><h2 className="mt-4 text-sm font-semibold">{title}</h2><p className="mt-1 text-xs text-muted">{description}</p></div></div>
}
