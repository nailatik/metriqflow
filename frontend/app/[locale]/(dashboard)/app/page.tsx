"use client";

import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useUserStore, useReportsStore, useSchedulesStore } from "@/shared/store/StoreProvider";
import { http } from "@/shared/lib/axios";

function InfoField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-textSecondary uppercase tracking-widest">
        {label}
      </span>
      <span className="text-sm font-medium text-textMain">{value ?? "—"}</span>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: boolean;
  href?: string;
}

function StatCard({ label, value, accent, href }: StatCardProps) {
  const inner = (
    <div
      className={`bg-surface border border-border rounded-xl px-6 py-5 flex flex-col gap-2 transition-all ${
        href ? "hover:border-primary hover:shadow-sm cursor-pointer" : ""
      }`}
    >
      <span className="text-xs font-semibold text-textSecondary uppercase tracking-widest">
        {label}
      </span>
      <span className={`text-3xl font-bold ${accent ? "text-primary" : "text-textMain"}`}>
        {value}
      </span>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

const STEP_ICONS = [
  /* Telegram */
  <svg key="tg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.314 13.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.834.942z"/>
  </svg>,
  /* VK */
  <svg key="vk" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C5.098 11.61 4.5 9.8 4.5 9.139c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.864 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V11.61c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.253-1.406 2.15-3.574 2.15-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.271.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.78 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.491-.085.745-.576.745z"/>
  </svg>,
  /* Report */
  <svg key="rep" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10,9 9,9 8,9"/>
  </svg>,
  /* Schedule */
  <svg key="sch" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <polyline points="9,16 11,18 15,14"/>
  </svg>,
];

interface OnboardingStep {
  done: boolean;
  titleKey: string;
  descKey: string;
  href: string;
}

function OnboardingCard({ steps, onDismiss }: { steps: OnboardingStep[]; onDismiss: () => void }) {
  const t = useTranslations("Dashboard.onboarding");
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* header strip */}
      <div className="px-7 pt-6 pb-5 border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${allDone ? "bg-green-500/10" : "bg-primary/10"}`}>
              {allDone ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-green-500">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-primary">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-textMain">
                {allDone ? t("allDone") : t("title")}
              </h2>
              <p className="text-xs text-textSecondary mt-0.5">
                {allDone ? t("allDoneDesc") : t("progress", { done: doneCount, total: steps.length })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* progress ring label */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-28 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${allDone ? "bg-green-500" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`text-xs font-bold tabular-nums ${allDone ? "text-green-500" : "text-primary"}`}>{pct}%</span>
            </div>
            <button
              onClick={onDismiss}
              className="text-xs text-textSecondary hover:text-textMain transition-colors"
            >
              {t("dismiss")}
            </button>
          </div>
        </div>
      </div>

      {/* steps grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`relative p-5 flex flex-col gap-3 transition-colors ${
              step.done ? "bg-green-500/[0.03]" : "hover:bg-border/20"
            }`}
          >
            {/* top row: icon + check */}
            <div className="flex items-center justify-between">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                step.done ? "bg-green-500/10 text-green-500" : "bg-border/60 text-textSecondary"
              }`}>
                {STEP_ICONS[i]}
              </div>
              {step.done ? (
                <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
              ) : (
                <span className="w-5 h-5 rounded-full border-2 border-border flex items-center justify-center text-[10px] font-bold text-textSecondary">
                  {i + 1}
                </span>
              )}
            </div>

            {/* text */}
            <div className="flex-1">
              <p className={`text-sm font-medium leading-snug ${step.done ? "text-textSecondary line-through" : "text-textMain"}`}>
                {t(step.titleKey as Parameters<typeof t>[0])}
              </p>
              <p className="text-xs text-textSecondary mt-1 leading-relaxed">
                {t(step.descKey as Parameters<typeof t>[0])}
              </p>
            </div>

            {/* action */}
            {!step.done && (
              <Link
                href={step.href}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                {t("go")}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default observer(function ProfilePage() {
  const tD = useTranslations("Dashboard");
  const tP = useTranslations("Profile");
  const userStore = useUserStore();
  const reportsStore = useReportsStore();
  const schedulesStore = useSchedulesStore();
  const user = userStore.user;

  const [integrationsCount, setIntegrationsCount] = useState<number | null>(null);
  const [tgChannelsCount, setTgChannelsCount] = useState<number | null>(null);
  const [vkCount, setVkCount] = useState<number | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // load dismissed flag per-user (after user is known)
  useEffect(() => {
    if (!user?.id) return;
    const key = `onboarding_v1_dismissed_${user.id}`;
    if (localStorage.getItem(key) === "1") {
      setOnboardingDismissed(true);
    }
  }, [user?.id]);

  useEffect(() => {
    if (reportsStore.list.length === 0) reportsStore.fetchReports();
  }, [reportsStore]);

  useEffect(() => {
    if (schedulesStore.list.length === 0) schedulesStore.fetchSchedules();
  }, [schedulesStore]);

  useEffect(() => {
    http
      .get<{ linked: boolean }>("/integrations/telegram/status")
      .then((r) => setIntegrationsCount(r.data.linked ? 1 : 0))
      .catch(() => setIntegrationsCount(0));

    http
      .get<{ id: number }[]>("/integrations/telegram/channels")
      .then((r) => setTgChannelsCount(r.data.length))
      .catch(() => setTgChannelsCount(0));

    http
      .get<{ id: number }[]>("/vk/communities")
      .then((r) => setVkCount(r.data.length))
      .catch(() => setVkCount(0));
  }, []);

  const handleDismiss = () => {
    if (!user?.id) return;
    localStorage.setItem(`onboarding_v1_dismissed_${user.id}`, "1");
    setOnboardingDismissed(true);
  };

  const onboardingSteps: OnboardingStep[] = [
    { done: (tgChannelsCount ?? 0) > 0, titleKey: "step1Title", descKey: "step1Desc", href: "/app/integrations" },
    { done: (vkCount ?? 0) > 0,         titleKey: "step2Title", descKey: "step2Desc", href: "/app/integrations" },
    { done: reportsStore.list.length > 0,   titleKey: "step3Title", descKey: "step3Desc", href: "/app/reports" },
    { done: schedulesStore.list.length > 0, titleKey: "step4Title", descKey: "step4Desc", href: "/app/reports" },
  ];

  const initials =
    user?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <div className="flex flex-col gap-6">

      {/* Hero */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="h-36 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent" />
        <div className="px-8 pb-8">
          <div className="-mt-12 flex items-end justify-between gap-6">
            <div className="flex items-end gap-5">
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold ring-4 ring-surface flex-shrink-0 shadow-md">
                {initials}
              </div>
              <div className="pb-1 min-w-0">
                <h1 className="text-2xl font-bold text-textMain leading-tight">
                  {user?.full_name ?? "—"}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-sm text-textSecondary">{user?.email ?? "—"}</span>
                  {user?.organization && (
                    <>
                      <span className="text-border select-none">·</span>
                      <span className="text-sm text-textSecondary">{user.organization}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="pb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                {tD("stats.active")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label={tD("stats.reports")} value={reportsStore.list.length} href="/app/reports" />
        <StatCard label={tD("stats.integrations")} value={integrationsCount ?? "—"} href="/app/integrations" />
        <StatCard label={tD("stats.activity")} value={tD("stats.active")} accent />
      </div>

      {/* Content grid: personal info + activity */}
      <div className="grid grid-cols-3 gap-4">

        {/* Personal info — 2 cols */}
        <div className="col-span-2 bg-surface border border-border rounded-xl p-7 shadow-sm">
          <h2 className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-6">
            {tP("personalInfo")}
          </h2>
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            <InfoField label={tP("fullName")} value={user?.full_name} />
            <InfoField label={tP("email")} value={user?.email} />
            <InfoField label={tP("phone")} value={user?.phone} />
            <InfoField label={tP("birthDate")} value={user?.birth_date ? user.birth_date.slice(0, 10) : undefined} />
            <InfoField label={tP("organization")} value={user?.organization} />
            <InfoField label={tP("accountId")} value={user?.id} />
          </div>
        </div>

        {/* Recent activity — 1 col */}
        <div className="bg-surface border border-border rounded-xl p-7 shadow-sm">
          <h2 className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-4">
            {tD("recentActivity.title")}
          </h2>
          {reportsStore.list.length === 0 ? (
            <p className="text-sm text-textSecondary">{tD("recentActivity.empty")}</p>
          ) : (
            <div className="space-y-3">
              {reportsStore.list.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-start gap-3">
                  <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    r.status === "ready" ? "bg-green-500" :
                    r.status === "failed" ? "bg-red-500" : "bg-yellow-400"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-textMain truncate">{r.title}</p>
                    <p className="text-xs text-textSecondary mt-0.5">
                      {new Date(r.created_at).toLocaleDateString()} · {r.format.toUpperCase()}
                    </p>
                  </div>
                </div>
              ))}
              {reportsStore.list.length > 5 && (
                <Link href="/app/reports" className="text-xs text-primary hover:underline block pt-1">
                  + {reportsStore.list.length - 5} more
                </Link>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Onboarding checklist — bottom */}
      {!onboardingDismissed && (
        <OnboardingCard steps={onboardingSteps} onDismiss={handleDismiss} />
      )}

    </div>
  );
});
