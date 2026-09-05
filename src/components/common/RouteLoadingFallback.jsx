function RouteLoadingFallback() {
  return <div className="grid min-h-64 place-items-center" role="status"><div className="text-center"><span className="mx-auto block size-6 animate-spin rounded-full border-2 border-border border-t-accent" /><p className="mt-3 text-sm text-muted">Loading workspace…</p></div></div>
}
export default RouteLoadingFallback
