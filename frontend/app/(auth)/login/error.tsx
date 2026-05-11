"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LoginError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-4 text-center">
      <h2 className="text-2xl font-semibold text-red-600 mb-4">Something went wrong</h2>
      <p className="text-textSecondary mb-6">{error.message}</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-indigo-700 transition"
        >
          Try again
        </button>
        <Link href="/" className="px-4 py-2 rounded-xl bg-gray-100 text-textMain hover:bg-gray-200 transition">
          Go home
        </Link>
      </div>
    </div>
  );
}
