export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-32" />
        <div className="h-4 bg-gray-100 rounded w-64" />
        <div className="h-4 bg-gray-100 rounded w-48" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="bg-surface border border-border rounded-xl p-5">
            <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
            <div className="h-7 bg-gray-100 rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
