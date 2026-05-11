"use client";

import { useEffect } from "react";
import { Button } from "@/shared/ui/Button/Button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SettingsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h2 className="text-2xl font-semibold text-red-600 mb-4">Failed to load settings</h2>
      <p className="text-textSecondary mb-6">{error.message}</p>
      <Button variant="primary" onClick={reset}>Try again</Button>
    </div>
  );
}
