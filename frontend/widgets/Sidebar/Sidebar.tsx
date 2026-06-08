"use client";

import { type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useUserStore } from "@/shared/store/StoreProvider";
import { usePlan } from "@/shared/hooks/usePlan";
import { PLAN_NAMES } from "@/shared/lib/plans";
import type { Locale } from "@/i18n/routing";

const navLinks = [
  { href: "/app",              labelKey: "profile",      exact: true  },
  { href: "/app/analytics",    labelKey: "analytics",    exact: false },
  { href: "/app/reports",      labelKey: "reports",      exact: false },
  { href: "/app/integrations", labelKey: "integrations", exact: false },
  { href: "/app/posts",            labelKey: "posts",           exact: false },
  { href: "/app/competitors",      labelKey: "competitors",     exact: false },
  { href: "/app/content-planner", labelKey: "contentPlanner",  exact: false },
  { href: "/app/settings",        labelKey: "settings",        exact: false },
] as const;

const ic = (paths: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-[18px] h-[18px] flex-shrink-0"
  >
    {paths}
  </svg>
);

const NAV_ICONS: Record<string, ReactNode> = {
  "/app": ic(
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  "/app/analytics": ic(
    <>
      <path d="M3 3v18h18" />
      <path d="M7 14l3-3 3 3 4-6" />
    </>
  ),
  "/app/reports": ic(
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h6" />
    </>
  ),
  "/app/integrations": ic(
    <>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </>
  ),
  "/app/posts": ic(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  "/app/competitors": ic(
    <>
      <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  "/app/content-planner": ic(
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
    </>
  ),
  "/app/settings": ic(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  "/app/billing": ic(
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </>
  ),
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = observer(({ collapsed, onToggle }: SidebarProps) => {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale() as Locale;
  const userStore = useUserStore();
  const { plan } = usePlan();

  const switchLocale = () => {
    const next = locale === "en" ? "ru" : "en";
    router.replace(pathname, { locale: next });
  };

  const handleLogout = () => {
    userStore.logout();
    router.push("/login");
  };

  const linkClass = (active: boolean) =>
    `group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
      active
        ? "bg-primary/10 text-primary font-semibold"
        : "text-textSecondary hover:bg-surfaceMuted hover:text-textMain font-medium"
    }`;

  return (
    <aside
      className={`${
        collapsed ? "w-14" : "w-64"
      } h-full bg-surface border-r border-border flex flex-col justify-between transition-all duration-200 overflow-hidden flex-shrink-0`}
    >
      {collapsed ? (
        <div className="flex flex-col items-center py-4 gap-4">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primaryHover grid place-items-center text-onAccent font-bold text-sm select-none">
            M
          </span>
          <button
            onClick={onToggle}
            aria-label="Expand sidebar"
            className="p-2 rounded-lg hover:bg-surfaceMuted text-textSecondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="p-4 flex flex-col h-full justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-7 px-1">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primaryHover grid place-items-center text-onAccent font-bold text-sm select-none">
                  M
                </span>
                <span className="text-[17px] font-semibold tracking-tight text-textMain">Metriq Flow</span>
              </Link>
              <button
                onClick={onToggle}
                aria-label="Collapse sidebar"
                className="p-1.5 rounded-lg hover:bg-surfaceMuted text-textSecondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {navLinks.map(({ href, labelKey, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link key={href} href={href} className={linkClass(active)}>
                    {NAV_ICONS[href]}
                    <span>{t(labelKey)}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-col gap-1 pt-4 mt-4 border-t border-border">
            <Link
              href="/app/billing"
              className={`${linkClass(pathname.startsWith("/app/billing"))} justify-between`}
            >
              <span className="flex items-center gap-3">
                {NAV_ICONS["/app/billing"]}
                {t("billing")}
              </span>
              <span
                className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                  plan === "free"
                    ? "bg-surfaceMuted text-textSecondary"
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}
              >
                {PLAN_NAMES[plan]}
              </span>
            </Link>

            <button
              onClick={switchLocale}
              aria-label={locale === "en" ? "Switch to Russian" : "Switch to English"}
              title={locale === "en" ? "Switch to Русский" : "Switch to English"}
              className="text-left px-3 py-2 rounded-lg hover:bg-surfaceMuted text-textSecondary hover:text-textMain font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {locale.toUpperCase()}
            </button>

            <button className="text-left px-3 py-2 rounded-lg hover:bg-surfaceMuted text-textSecondary hover:text-textMain text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
              {t("support")}
            </button>
            <button
              onClick={handleLogout}
              className="text-left px-3 py-2 rounded-lg text-error hover:bg-error/10 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/30"
            >
              {t("logout")}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
});
