"use client";

import { useEffect, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useUserStore } from "@/shared/store/StoreProvider";
import { usePlan } from "@/shared/hooks/usePlan";
import { PLAN_NAMES } from "@/shared/lib/plans";
import type { Locale } from "@/i18n/routing";

const navLinks = [
  { href: "/app",               labelKey: "profile",       exact: true  },
  { href: "/app/analytics",     labelKey: "analytics",     exact: false },
  { href: "/app/reports",       labelKey: "reports",       exact: false },
  { href: "/app/integrations",  labelKey: "integrations",  exact: false },
  { href: "/app/posts",         labelKey: "posts",         exact: false },
  { href: "/app/competitors",   labelKey: "competitors",   exact: false },
  { href: "/app/content-planner", labelKey: "contentPlanner", exact: false },
  { href: "/app/settings",      labelKey: "settings",      exact: false },
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

const GlobeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-[18px] h-[18px] flex-shrink-0"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3c-2.5 2.5-4 5.5-4 9s1.5 6.5 4 9M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9M3 12h18" />
  </svg>
);

const HelpIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-[18px] h-[18px] flex-shrink-0"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 17v.01" />
    <path d="M12 13.5a2.5 2.5 0 0 0 2-4 2.5 2.5 0 0 0-4.5 1.5" />
  </svg>
);

const LogOutIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-[18px] h-[18px] flex-shrink-0"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  drawerOpen: boolean;
  onCloseDrawer: () => void;
}

export const Sidebar = observer(({ collapsed, onToggle, drawerOpen, onCloseDrawer }: SidebarProps) => {
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

  // Esc closes drawer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCloseDrawer]);

  // Label visible on: phone (in drawer) always + desktop-full
  // Hidden on: tablet (md) + desktop-collapsed
  const labelCls = `block md:hidden ${!collapsed ? "lg:block" : ""}`;

  // Nav/button item layout per mode:
  // phone: px-3, justify-start
  // tablet: px-0, justify-center (icon centered in 56px rail)
  // desktop-full: px-3, justify-start
  // desktop-collapsed: px-0, justify-center
  const railCls = collapsed
    ? "px-3 md:px-0 md:justify-center lg:px-0 lg:justify-center"
    : "px-3 md:px-0 md:justify-center lg:px-3 lg:justify-start";

  const navLinkCls = (active: boolean) =>
    `group flex items-center gap-3 min-h-11 rounded-lg text-sm transition-colors ` +
    `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ` +
    railCls + " " +
    (active
      ? "bg-primary/10 text-primary font-semibold"
      : "text-textSecondary hover:bg-surfaceMuted hover:text-textMain font-medium");

  const btnCls =
    `flex items-center gap-3 min-h-11 rounded-lg text-sm transition-colors ` +
    `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ` +
    railCls;

  return (
    <>
      {/* Scrim — phone only, closes drawer on click */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onCloseDrawer}
          aria-hidden="true"
        />
      )}

      <aside
        id="sidebar"
        className={[
          // Base: phone off-canvas drawer
          "fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border",
          "flex flex-col overflow-hidden",
          "transition-transform duration-200 ease-out motion-reduce:transition-none",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
          // Tablet: static icon-rail in document flow
          "md:static md:z-auto md:translate-x-0 md:w-14",
          // Desktop: full or collapsed rail
          collapsed ? "lg:w-14" : "lg:w-64",
        ].join(" ")}
      >
        {/* ── Header row (logo + text + collapse btn) ───────────────────── */}
        <div
          className={[
            "flex items-center gap-2 border-b border-border overflow-hidden flex-shrink-0",
            "px-4 h-[60px]",
            // Tablet: center logo mark
            "md:justify-center md:px-0",
            // Desktop: restore left-align (full) or keep centered (collapsed)
            collapsed
              ? "lg:justify-center lg:px-0"
              : "lg:justify-start lg:px-4",
          ].join(" ")}
        >
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 flex-shrink-0 rounded-lg bg-gradient-to-br from-primary to-primaryHover grid place-items-center text-onAccent font-bold text-sm select-none">
              M
            </span>
            <span className={`text-[17px] font-semibold tracking-tight text-textMain truncate ${labelCls}`}>
              Metriq Flow
            </span>
          </Link>

          {/* Collapse-to-rail button — desktop-full only */}
          <button
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className={`hidden p-1.5 ml-auto flex-shrink-0 rounded-lg hover:bg-surfaceMuted text-textSecondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${!collapsed ? "lg:flex" : ""}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Expand button — desktop-collapsed only (below logo) */}
        <div className={`hidden justify-center py-2 border-b border-border flex-shrink-0 ${collapsed ? "lg:flex" : ""}`}>
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

        {/* ── Nav links ──────────────────────────────────────────────────── */}
        <nav className="flex-1 p-2 flex flex-col gap-1 overflow-y-auto">
          {navLinks.map(({ href, labelKey, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={t(labelKey)}
                className={navLinkCls(active)}
              >
                {NAV_ICONS[href]}
                <span className={`truncate ${labelCls}`}>{t(labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── Bottom section ─────────────────────────────────────────────── */}
        <div className="p-2 border-t border-border flex flex-col gap-1 flex-shrink-0">
          {/* Billing */}
          <Link
            href="/app/billing"
            title={t("billing")}
            className={navLinkCls(pathname.startsWith("/app/billing"))}
          >
            {NAV_ICONS["/app/billing"]}
            <span className={`flex items-center justify-between flex-1 min-w-0 ${labelCls}`}>
              <span className="truncate">{t("billing")}</span>
              <span
                className={`ml-2 flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                  plan === "free"
                    ? "bg-surfaceMuted text-textSecondary"
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}
              >
                {PLAN_NAMES[plan]}
              </span>
            </span>
          </Link>

          {/* Locale toggle */}
          <button
            onClick={switchLocale}
            title={locale === "en" ? "Switch to Русский" : "Switch to English"}
            aria-label={locale === "en" ? "Switch to Russian" : "Switch to English"}
            className={`${btnCls} text-textSecondary hover:bg-surfaceMuted hover:text-textMain font-medium`}
          >
            <GlobeIcon />
            <span className={labelCls}>{locale.toUpperCase()}</span>
          </button>

          {/* Support */}
          <button
            title={t("support")}
            className={`${btnCls} text-textSecondary hover:bg-surfaceMuted hover:text-textMain`}
          >
            <HelpIcon />
            <span className={labelCls}>{t("support")}</span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title={t("logout")}
            className={`${btnCls} text-error hover:bg-error/10 focus-visible:ring-error/30`}
          >
            <LogOutIcon />
            <span className={labelCls}>{t("logout")}</span>
          </button>
        </div>
      </aside>
    </>
  );
});
