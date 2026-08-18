import { ShieldCheck, TrendingUp } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

const pulseBars = [
  'h-[34%]',
  'h-[48%]',
  'h-[40%]',
  'h-[62%]',
  'h-[54%]',
  'h-[73%]',
  'h-[67%]',
  'h-[88%]',
  'h-[78%]',
  'h-[96%]',
  'h-[84%]',
  'h-full',
]

function AuthLayout() {
  return (
    <main className="relative grid min-h-dvh overflow-hidden bg-canvas lg:grid-cols-[minmax(0,1fr)_minmax(28rem,0.8fr)]">
      <div aria-hidden="true" className="auth-grid absolute inset-0 opacity-60" />

      <section className="relative hidden min-h-dvh flex-col justify-between border-r border-border p-10 lg:flex xl:p-14">
        <Link className="flex items-center gap-3" to="/">
          <span className="grid size-9 place-items-center rounded-lg bg-accent text-white">
            <ShieldCheck className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">TradePilot</span>
        </Link>

        <div className="max-w-lg">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1.5 text-xs text-muted">
            <span className="size-1.5 rounded-full bg-positive" />
            Global markets, one focused workspace
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-[-0.04em] xl:text-5xl">
            Trade with clarity.
            <span className="block text-muted">Move with confidence.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-muted">
            A precise workspace designed to keep your forex and digital asset activity organized.
          </p>

          <div className="mt-10 max-w-md rounded-2xl border border-border bg-surface/80 p-5 shadow-panel backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted">Market pulse</p>
                <p className="mt-1 text-sm font-semibold">Cross-asset overview</p>
              </div>
              <span className="grid size-9 place-items-center rounded-lg bg-positive/10 text-positive">
                <TrendingUp className="size-4" />
              </span>
            </div>
            <div className="mt-7 flex h-20 items-end gap-2" aria-hidden="true">
              {pulseBars.map((heightClass, index) => (
                <span
                  className={`flex-1 rounded-t-sm bg-accent/35 odd:bg-accent/15 ${heightClass}`}
                  key={`${heightClass}-${index}`}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted">Built for disciplined market participants.</p>
      </section>

      <section className="relative flex min-h-dvh items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <Link className="mb-8 flex items-center justify-center gap-3 lg:hidden" to="/">
            <span className="grid size-9 place-items-center rounded-lg bg-accent text-white">
              <ShieldCheck className="size-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">TradePilot</span>
          </Link>
          <div className="rounded-2xl border border-border bg-surface/95 p-6 shadow-panel backdrop-blur sm:p-8">
            <Outlet />
          </div>
          <p className="mt-5 text-center text-xs text-muted">
            Protected by secure access controls and encrypted sessions.
          </p>
        </div>
      </section>
    </main>
  )
}

export default AuthLayout
