export default function IntegrationsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-40" />
      <div className="grid md:grid-cols-3 gap-4">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="bg-surface border border-border rounded-xl p-6">
            <div className="h-5 bg-gray-200 rounded w-24 mb-3" />
            <div className="h-4 bg-gray-100 rounded w-32 mb-4" />
            <div className="h-9 bg-gray-200 rounded w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
