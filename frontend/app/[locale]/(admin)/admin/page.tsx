export default function AdminOverviewPage() {
  return (
    <>
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
        Full charts and live stats coming in the next phase.
      </p>
    </>
  );
}
