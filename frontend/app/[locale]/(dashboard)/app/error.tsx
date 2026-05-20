"use client";

import { ErrorBoundary } from "@/widgets/ErrorBoundary/ErrorBoundary";

export default function DashboardError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorBoundary {...props} variant="inline" showHome={false} />;
}
