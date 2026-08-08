/**
 * Instant navigation skeleton for every portal page.
 *
 * Each page is `force-dynamic` and loads its data from MongoDB on the server, so
 * without a loading fallback the App Router keeps the previous page frozen on
 * screen until that render finishes, which reads as "the tab hangs, then jumps".
 * This Suspense fallback renders the moment a link is clicked, so switching tabs
 * feels instant while the real content streams in behind it. The sidebar, topbar
 * and journey stepper live in the layout and stay put across the transition.
 */
export default function PortalLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      {/* page header */}
      <div className="mb-6">
        <div className="h-6 w-64 rounded-lg bg-slate-300/70" />
        <div className="mt-2 h-3.5 w-full max-w-2xl rounded bg-slate-200/80" />
        <div className="mt-1.5 h-3.5 w-3/4 max-w-xl rounded bg-slate-200/80" />
      </div>

      {/* stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white/70 p-4">
            <div className="h-3 w-20 rounded bg-slate-200" />
            <div className="mt-3 h-6 w-16 rounded bg-slate-300/70" />
            <div className="mt-2 h-2.5 w-24 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* content panels */}
      <div className="grid lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white/70 p-5">
            <div className="h-4 w-40 rounded bg-slate-300/70" />
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: 5 }).map((__, j) => (
                <div key={j} className="h-3 rounded bg-slate-200" style={{ width: `${90 - j * 8}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
