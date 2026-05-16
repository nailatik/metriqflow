"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useUserStore } from "@/shared/store/StoreProvider";
import { authService } from "@/entities/user/api/authService";
import { Button } from "@/shared/ui/Button/Button";

type Status = "confirm" | "loading" | "done" | "error";

export default function DeleteConfirmPage() {
  const t = useTranslations("DeleteConfirm");
  const router = useRouter();
  const searchParams = useSearchParams();
  const userStore = useUserStore();

  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("confirm");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError(t("noToken"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async () => {
    if (!token) return;
    setStatus("loading");
    try {
      await authService.confirmDeleteAccount(token);
      userStore.logout();
      setStatus("done");
      setTimeout(() => router.replace("/login"), 3000);
    } catch {
      setStatus("error");
      setError(t("errorText"));
    }
  };

  if (status === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">👋</div>
          <h1 className="text-2xl font-semibold text-textMain">{t("doneTitle")}</h1>
          <p className="text-textSecondary text-sm">{t("doneSubtitle")}</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-5xl">❌</div>
          <h1 className="text-2xl font-semibold text-textMain">{t("errorTitle")}</h1>
          <p className="text-textSecondary text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-sm text-center space-y-6">
        <div className="text-5xl">⚠️</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-textMain">{t("title")}</h1>
          <p className="text-textSecondary text-sm">{t("subtitle")}</p>
        </div>
        <Button
          variant="primary"
          onClick={handleDelete}
          disabled={status === "loading"}
          className="w-full !bg-red-600 hover:!bg-red-700"
        >
          {status === "loading" ? t("loading") : t("confirm")}
        </Button>
        <button
          onClick={() => router.replace("/app")}
          className="text-sm text-textSecondary hover:text-textMain transition-colors"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
