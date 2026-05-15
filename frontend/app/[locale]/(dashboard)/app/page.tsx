"use client";

import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useUserStore, useReportsStore } from "@/shared/store/StoreProvider";
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

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

export default observer(function ProfilePage() {
  const tD = useTranslations("Dashboard");
  const tP = useTranslations("Profile");
  const userStore = useUserStore();
  const reportsStore = useReportsStore();
  const user = userStore.user;

  const [integrationsCount, setIntegrationsCount] = useState<number | null>(null);

  useEffect(() => {
    if (reportsStore.list.length === 0) {
      reportsStore.fetchReports();
    }
  }, [reportsStore]);

  useEffect(() => {
    http
      .get<{ linked: boolean }>("/integrations/telegram/status")
      .then((r) => setIntegrationsCount(r.data.linked ? 1 : 0))
      .catch(() => setIntegrationsCount(0));
  }, []);

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
        <StatCard
          label={tD("stats.reports")}
          value={reportsStore.list.length}
          href="/app/reports"
        />
        <StatCard
          label={tD("stats.integrations")}
          value={integrationsCount ?? "—"}
          href="/app/integrations"
        />
        <StatCard
          label={tD("stats.activity")}
          value={tD("stats.active")}
          accent
        />
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
    </div>
  );
});
