import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-5xl font-bold text-textMain">404</h1>
      <h2 className="text-xl font-semibold mt-4 text-textMain">Page not found</h2>
      <p className="text-textSecondary mt-2">This page doesn&apos;t exist in the dashboard.</p>
      <Link
        href="/app"
        className="mt-6 px-4 py-2 rounded-xl bg-primary text-white hover:bg-indigo-700 transition inline-block"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
