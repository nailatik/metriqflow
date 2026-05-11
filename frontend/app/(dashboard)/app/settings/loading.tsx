export default function SettingsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-32" />
      <div className="bg-white border border-border rounded-xl p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
