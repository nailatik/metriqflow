"use client";

import { observer } from "mobx-react-lite";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useUserStore } from "@/shared/store/StoreProvider";
import type { Locale } from "@/i18n/routing";

const navLinks = [
  { href: "/app",              labelKey: "profile",      exact: true  },
  { href: "/app/analytics",    labelKey: "analytics",    exact: false },
  { href: "/app/reports",      labelKey: "reports",      exact: false },
  { href: "/app/integrations", labelKey: "integrations", exact: false },
  { href: "/app/settings",     labelKey: "settings",     exact: false },
] as const;

export const Sidebar = observer(() => {
  const t = useTranslations("Sidebar");
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale() as Locale;
  const userStore = useUserStore();

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
      isActive ? "bg-primary text-white" : "hover:bg-gray-100 text-textSecondary"
    }`;
  };

  return (
    <aside className="w-64 border-r border-border flex flex-col justify-between p-6">
      <div>
        <Link href="/">
          <h2 className="text-xl font-semibold mb-8">Metriq Flow</h2>
        </Link>
        <nav className="flex flex-col gap-2 text-sm">
          {navLinks.map(({ href, labelKey, exact }) => (
            <Link key={href} href={href} className={getLinkClass(href, exact)}>
              {t(labelKey)}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        {/* Language toggle */}
        <button
          onClick={switchLocale}
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
    </aside>
  );
});
