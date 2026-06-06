"use client";

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
  { href: "/app/competitors",  labelKey: "competitors",  exact: false },
  { href: "/app/settings",     labelKey: "settings",     exact: false },
] as const;

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

  const getLinkClass = (href: string, exact: boolean) => {
    const isActive = exact ? pathname === href : pathname.startsWith(href);
    return `px-3 py-2 rounded-lg transition ${
      isActive ? "bg-primary text-white" : "hover:bg-border text-textSecondary"
    }`;
  };

  return (
    <aside
      className={`${
        collapsed ? "w-12" : "w-64"
      } h-full border-r border-border flex flex-col justify-between transition-all duration-200 overflow-hidden flex-shrink-0`}
    >
      {collapsed ? (
        <div className="flex flex-col items-center py-4 gap-4">
          <button
            onClick={onToggle}
            aria-label="Expand sidebar"
            className="p-2 rounded-lg hover:bg-border text-textSecondary transition"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      ) : (
        <div className="p-6 flex flex-col h-full justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-8">
              <Link href="/">
                <h2 className="text-xl font-semibold">Metriq Flow</h2>
              </Link>
              <button
                onClick={onToggle}
                aria-label="Collapse sidebar"
                className="p-1.5 rounded-lg hover:bg-border text-textSecondary transition"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-2 text-sm">
              {navLinks.map(({ href, labelKey, exact }) => (
                <Link key={href} href={href} className={getLinkClass(href, exact)}>
                  {t(labelKey)}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <Link
              href="/app/billing"
              className={`px-3 py-2 rounded-lg flex items-center justify-between hover:bg-border transition ${
                pathname.startsWith("/app/billing") ? "bg-primary text-white" : "text-textSecondary"
              }`}
            >
              <span>{t("billing")}</span>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                plan === "free"
                  ? "bg-border text-textSecondary"
                  : "bg-primary/10 text-primary border border-primary/20"
              }`}>
                {PLAN_NAMES[plan]}
              </span>
            </Link>

            <button
              onClick={switchLocale}
              aria-label={locale === "en" ? "Switch to Russian" : "Switch to English"}
              title={locale === "en" ? "Switch to Русский" : "Switch to English"}
              className="text-left px-3 py-2 rounded-lg hover:bg-border text-textSecondary font-medium"
            >
              {locale.toUpperCase()}
            </button>

            <button className="text-left px-3 py-2 rounded-lg hover:bg-border text-textSecondary">
              {t("support")}
            </button>
            <button
              onClick={handleLogout}
              className="text-left px-3 py-2 rounded-lg text-error hover:bg-error/10"
            >
              {t("logout")}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
});
