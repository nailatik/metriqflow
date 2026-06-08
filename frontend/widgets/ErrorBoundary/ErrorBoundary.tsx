"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import * as Sentry from "@sentry/nextjs";
import { Link } from "@/i18n/navigation";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  variant?: "fullscreen" | "inline";
  showHome?: boolean;
}

export function ErrorBoundary({
  error,
  reset,
  variant = "fullscreen",
  showHome = true,
}: ErrorBoundaryProps) {
  const t = useTranslations("Common.error");

  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  const wrapper =
    variant === "fullscreen"
      ? "min-h-screen flex flex-col items-center justify-center bg-bg px-4 text-center"
      : "flex flex-col items-center justify-center min-h-[60vh] text-center";

  return (
    <div className={wrapper}>
      <h2 className="text-2xl font-semibold text-error mb-4">{t("title")}</h2>
      {error.digest && (
        <p className="text-xs text-textSecondary mb-6 font-mono">#{error.digest}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-xl bg-primary text-onAccent hover:bg-primaryHover transition"
        >
          {t("tryAgain")}
        </button>
        {showHome && (
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-surfaceMuted text-textMain hover:bg-border transition"
          >
            {t("goHome")}
          </Link>
        )}
      </div>
    </div>
  );
}
