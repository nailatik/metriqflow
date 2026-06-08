interface PageLoaderProps {
  variant?: "fullscreen" | "inline";
}

export function PageLoader({ variant = "fullscreen" }: PageLoaderProps) {
  if (variant === "inline") {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-8 bg-border rounded w-48" />
        <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
          <div className="h-5 bg-border rounded w-32" />
          <div className="h-4 bg-surfaceMuted rounded w-64" />
          <div className="h-4 bg-surfaceMuted rounded w-48" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface border border-border rounded-xl p-5">
              <div className="h-4 bg-border rounded w-20 mb-3" />
              <div className="h-7 bg-surfaceMuted rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );
}
