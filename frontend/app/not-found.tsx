import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 — Page not found",
};

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-textMain tracking-tight">404</h1>
        <h2 className="text-xl font-semibold mt-4 text-textMain">Page not found</h2>
        <p className="text-textSecondary mt-2">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl font-medium bg-primary text-white hover:bg-indigo-700 shadow-sm transition-all inline-block"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
