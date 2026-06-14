export default function AdminOverviewPage() {
  return (
    <div className="min-h-dvh bg-bg text-textMain font-sans flex">
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-surface px-4 py-6 gap-1">
        <span className="text-[11px] font-mono text-textSecondary uppercase tracking-widest mb-3 px-2">
          Admin
        </span>
        <a
          href="/admin"
          className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-sm font-medium bg-primary/10 text-primary"
        >
          Overview
        </a>
        <a
          href="/admin/promos"
          className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-sm font-medium text-textSecondary hover:bg-surfaceMuted hover:text-textMain transition-colors"
        >
          Promo codes
        </a>
        <a
          href="/admin/users"
          className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-sm font-medium text-textSecondary hover:bg-surfaceMuted hover:text-textMain transition-colors"
        >
          Users
        </a>
        <a
          href="/admin/billing"
          className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-sm font-medium text-textSecondary hover:bg-surfaceMuted hover:text-textMain transition-colors"
        >
          Billing
        </a>
        <a
          href="/admin/audit"
          className="flex items-center gap-2.5 px-2 py-2 rounded-xl text-sm font-medium text-textSecondary hover:bg-surfaceMuted hover:text-textMain transition-colors"
        >
          Audit log
        </a>
        <div className="mt-auto">
          <a
            href="/app"
            className="flex items-center gap-2 px-2 py-2 text-sm text-textSecondary hover:text-textMain transition-colors"
          >
            ← Back to app
          </a>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-6 lg:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-textMain mb-1">Overview</h1>
        <p className="text-sm text-textSecondary mb-8">MetriqFlow admin console</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {["Total users", "Active 7d", "Active 30d", "Paid users", "New 7d", "Active promos", "Redemptions 30d"].map(
            (label) => (
              <div key={label} className="bg-surface border border-border rounded-xl shadow-card p-4">
                <p className="text-xs text-textSecondary mb-1">{label}</p>
                <p className="text-2xl font-mono font-bold text-textMain tabular-nums">—</p>
              </div>
            )
          )}
        </div>

        <p className="mt-10 text-xs text-textSecondary">
          Full dashboard loading in next phase.
        </p>
      </main>
    </div>
  );
}
