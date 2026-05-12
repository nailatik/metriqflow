export default function VKLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="h-16 bg-gray-100 rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-gray-100 rounded-xl" />
    </div>
  );
}
