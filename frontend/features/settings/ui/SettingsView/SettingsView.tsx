"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { observer } from "mobx-react-lite";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/shared/store/StoreProvider";
import { Link } from "@/i18n/navigation";
import { usePlan } from "@/shared/hooks/usePlan";
import { PLAN_NAMES } from "@/shared/lib/plans";

export const SettingsView = observer(() => {
  const t = useTranslations("Settings");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userStore = useUserStore();
  const user = userStore.user;
  const { plan } = usePlan();

  // ── Organization edit ──────────────────────────────────────────────────────
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgValue, setOrgValue] = useState(user?.organization ?? "");
  const [orgStatus, setOrgStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  const handleSaveOrg = async () => {
    setOrgStatus("saving");
    const result = await userStore.updateOrganization(orgValue);
    if (result.success) {
      setOrgStatus("success");
      setEditingOrg(false);
      setTimeout(() => setOrgStatus("idle"), 2500);
    } else {
      setOrgStatus("error");
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const [editingPwd, setEditingPwd] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });
  const [pwdStatus, setPwdStatus] = useState<"idle" | "saving" | "success" | "error" | "mismatch">("idle");
  const [pwdError, setPwdError] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdStatus("mismatch");
      return;
    }
    setPwdStatus("saving");
    const result = await userStore.changePassword(pwdForm.current, pwdForm.next);
    if (result.success) {
      setPwdStatus("success");
      setPwdForm({ current: "", next: "", confirm: "" });
      setTimeout(() => {
        setPwdStatus("idle");
        setEditingPwd(false);
      }, 2500);
    } else {
      setPwdError(result.error ?? t("security.errorGeneric"));
      setPwdStatus("error");
    }
  };

  const handleCancelPwd = () => {
    setEditingPwd(false);
    setPwdForm({ current: "", next: "", confirm: "" });
    setPwdStatus("idle");
    setPwdError("");
  };

  // ── Delete account ─────────────────────────────────────────────────────────
  const [deleteStep, setDeleteStep] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmToken, setConfirmToken] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "error">("idle");

  useEffect(() => {
    const token = searchParams.get("confirmDelete");
    if (token) {
      setConfirmToken(token);
      setShowConfirmModal(true);
    }
  }, [searchParams]);

  const handleRequestDelete = async () => {
    setDeleteStep("sending");
    const result = await userStore.requestDeleteAccount(locale);
    if (result.success) {
      setDeleteStep("sent");
    } else {
      setDeleteStep("error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmToken) return;
    setDeleteStatus("deleting");
    const ok = await userStore.deleteAccount(confirmToken);
    if (ok) {
      router.push(`/${locale}/login`);
    } else {
      setDeleteStatus("error");
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-textMain">{t("title")}</h1>

      {/* ── Profile section ─────────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-textMain mb-4">{t("account.title")}</h2>
        <div className="space-y-4 text-textSecondary">

          {/* Email */}
          <div>
            <p className="text-sm font-medium text-textMain">{t("account.email")}</p>
            <div className="flex items-center gap-2 mt-1">
              <p>{user?.email ?? "—"}</p>
              {user?.email_verified === false && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  {t("account.notVerified")}
                </span>
              )}
              {user?.email_verified && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  {t("account.verified")}
                </span>
              )}
            </div>
          </div>

          {/* Full name */}
          <div>
            <p className="text-sm font-medium text-textMain">{t("account.fullName")}</p>
            <p className="mt-1">{user?.full_name ?? "—"}</p>
          </div>

          {/* Organization */}
          <div>
            <p className="text-sm font-medium text-textMain mb-1">{t("account.organization")}</p>
            {editingOrg ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={orgValue}
                  onChange={(e) => setOrgValue(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-textMain text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder={t("account.organization")}
                  autoFocus
                />
                <button
                  onClick={handleSaveOrg}
                  disabled={orgStatus === "saving"}
                  className="px-3 py-1.5 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-60 transition"
                >
                  {orgStatus === "saving" ? "..." : t("account.save")}
                </button>
                <button
                  onClick={() => { setEditingOrg(false); setOrgValue(user?.organization ?? ""); setOrgStatus("idle"); }}
                  className="px-3 py-1.5 text-sm text-textSecondary hover:text-textMain transition"
                >
                  {t("account.cancel")}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-1">
                <span>{user?.organization || "—"}</span>
                <button
                  onClick={() => { setEditingOrg(true); setOrgValue(user?.organization ?? ""); }}
                  className="text-xs text-accent hover:underline"
                >
                  {t("account.edit")}
                </button>
              </div>
            )}
            {orgStatus === "success" && (
              <p className="text-xs text-green-500 mt-1">{t("account.saveSuccess")}</p>
            )}
            {orgStatus === "error" && (
              <p className="text-xs text-red-500 mt-1">{t("account.saveError")}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <p className="text-sm font-medium text-textMain">{t("account.phone")}</p>
            <p className="mt-1">{user?.phone ?? "—"}</p>
          </div>

          {/* Subscription */}
          <div>
            <p className="text-sm font-medium text-textMain">{t("account.subscription")}</p>
            <div className="mt-1">
              <Link
                href="/app/billing"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                {PLAN_NAMES[plan]}
                <span className="text-xs opacity-60">→</span>
              </Link>
            </div>
          </div>

          {/* Password */}
          <div>
            <p className="text-sm font-medium text-textMain mb-1">{t("account.password")}</p>
            {editingPwd ? (
              <form onSubmit={handleChangePassword} className="space-y-3 mt-1 max-w-sm">
                <input
                  type="password"
                  value={pwdForm.current}
                  onChange={(e) => setPwdForm(f => ({ ...f, current: e.target.value }))}
                  placeholder={t("security.currentPassword")}
                  required
                  autoFocus
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-textMain text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <input
                  type="password"
                  value={pwdForm.next}
                  onChange={(e) => setPwdForm(f => ({ ...f, next: e.target.value }))}
                  placeholder={t("security.newPassword")}
                  required
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-textMain text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <input
                  type="password"
                  value={pwdForm.confirm}
                  onChange={(e) => setPwdForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder={t("security.confirmPassword")}
                  required
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-textMain text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {pwdStatus === "mismatch" && (
                  <p className="text-xs text-red-500">{t("security.passwordsMismatch")}</p>
                )}
                {pwdStatus === "error" && (
                  <p className="text-xs text-red-500">{pwdError}</p>
                )}
                {pwdStatus === "success" && (
                  <p className="text-xs text-green-500">{t("security.successMessage")}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={pwdStatus === "saving" || pwdStatus === "success"}
                    className="px-3 py-1.5 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-60 transition"
                  >
                    {pwdStatus === "saving" ? t("security.saving") : t("security.save")}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelPwd}
                    className="px-3 py-1.5 text-sm text-textSecondary hover:text-textMain transition"
                  >
                    {t("account.cancel")}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-3 mt-1">
                <span className="tracking-widest text-textSecondary">{"•".repeat(user?.password_length ?? 8)}</span>
                <button
                  onClick={() => setEditingPwd(true)}
                  className="text-xs text-accent hover:underline"
                >
                  {t("account.edit")}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Danger zone ─────────────────────────────────────────────────────── */}
      <div className="bg-surface border border-red-500/30 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-red-500 mb-2">{t("danger.title")}</h2>
        <p className="text-sm text-textSecondary mb-4">{t("danger.deleteDescription")}</p>

        {deleteStep === "idle" && (
          <button
            onClick={handleRequestDelete}
            className="px-4 py-2 text-sm font-medium border border-red-500 text-red-500 rounded-lg hover:bg-red-500/10 transition"
          >
            {t("danger.deleteAccount")}
          </button>
        )}
        {deleteStep === "sending" && (
          <button disabled className="px-4 py-2 text-sm border border-red-500/50 text-red-500/50 rounded-lg">
            {t("danger.sending")}
          </button>
        )}
        {deleteStep === "sent" && (
          <p className="text-sm text-green-500">{t("danger.emailSent")}</p>
        )}
        {deleteStep === "error" && (
          <div className="space-y-2">
            <p className="text-sm text-red-500">{t("danger.sendError")}</p>
            <button
              onClick={() => setDeleteStep("idle")}
              className="text-xs text-textSecondary hover:text-textMain underline"
            >
              {t("danger.cancel")}
            </button>
          </div>
        )}
      </div>

      {/* ── Confirm delete modal ─────────────────────────────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-xl font-semibold text-red-500 mb-3">{t("danger.confirmDeleteTitle")}</h2>
            <p className="text-textSecondary text-sm mb-6">{t("danger.confirmDeleteDescription")}</p>

            {deleteStatus === "error" && (
              <p className="text-sm text-red-500 mb-4">{t("danger.deleteError")}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleConfirmDelete}
                disabled={deleteStatus === "deleting"}
                className="flex-1 py-2 text-sm font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-60 transition"
              >
                {deleteStatus === "deleting" ? t("danger.deleting") : t("danger.confirmDeleteButton")}
              </button>
              <button
                onClick={() => { setShowConfirmModal(false); router.replace(`/${locale}/app/settings`); }}
                className="flex-1 py-2 text-sm font-medium border border-border text-textSecondary rounded-lg hover:text-textMain transition"
              >
                {t("danger.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
