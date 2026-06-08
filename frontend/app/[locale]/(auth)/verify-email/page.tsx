"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useUserStore } from "@/shared/store/StoreProvider";
import { authService } from "@/entities/user/api/authService";
import { Button } from "@/shared/ui/Button/Button";

type Status = "pending" | "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  const t = useTranslations("VerifyEmail");
  const router = useRouter();
  const searchParams = useSearchParams();
  const userStore = useUserStore();

  const locale = useLocale();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>(token ? "verifying" : "pending");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userStore.state.token && !userStore.state.user) {
      userStore.fetchMe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect to app if email already verified (e.g. verified in another tab)
  useEffect(() => {
    if (userStore.state.user?.email_verified === true && status === "pending") {
      router.replace("/app");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStore.state.user, status]);

  const verifyCalledRef = useRef(false);
  useEffect(() => {
    if (!token || verifyCalledRef.current) return;
    verifyCalledRef.current = true;
    authService
      .verifyEmail(token)
      .then(() => {
        setStatus("success");
        // Refresh user data so email_verified flag updates
        userStore.fetchMe();
        setTimeout(() => router.replace("/app"), 2000);
      })
      .catch(() => {
        setStatus("error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleResend = async () => {
    setResendLoading(true);
    setError("");
    try {
      await authService.resendVerification(locale);
      setResendSent(true);
    } catch {
      setError(t("resendError"));
    } finally {
      setResendLoading(false);
    }
  };

  const email = userStore.state.user?.email ?? "";

  if (status === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-textSecondary">{t("verifying")}</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-5xl">✅</div>
          <h1 className="text-2xl font-semibold text-textMain">{t("successTitle")}</h1>
          <p className="text-textSecondary text-sm">{t("successSubtitle")}</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-card text-center space-y-4">
          <div className="text-5xl">❌</div>
          <h1 className="text-2xl font-semibold text-textMain">{t("errorTitle")}</h1>
          <p className="text-textSecondary text-sm">{t("errorSubtitle")}</p>
          {resendSent ? (
            <p className="text-success text-sm">{t("resendSuccess")}</p>
          ) : (
            <Button variant="primary" onClick={handleResend} disabled={resendLoading} className="w-full">
              {resendLoading ? t("resendLoading") : t("resend")}
            </Button>
          )}
          {error && <p className="text-error text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  // status === "pending"
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-card text-center space-y-6">
        <div className="text-5xl">✉️</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-textMain">{t("title")}</h1>
          <p className="text-textSecondary text-sm">
            {t("subtitle")} <span className="font-medium text-textMain">{email}</span>
          </p>
          <p className="text-textSecondary text-sm">{t("hint")}</p>
        </div>

        {resendSent ? (
          <p className="text-success text-sm">{t("resendSuccess")}</p>
        ) : (
          <div className="space-y-3">
            <Button
              variant="primary"
              onClick={handleResend}
              disabled={resendLoading}
              className="w-full"
            >
              {resendLoading ? t("resendLoading") : t("resend")}
            </Button>
            {error && <p className="text-error text-sm">{error}</p>}
          </div>
        )}

        <button
          onClick={() => { userStore.logout(); router.replace("/login"); }}
          className="text-sm text-textSecondary hover:text-textMain transition-colors"
        >
          {t("logout")}
        </button>
      </div>
    </div>
  );
}
