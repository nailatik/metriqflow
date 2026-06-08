"use client";

import { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useUserStore } from "@/shared/store/StoreProvider";
import { Button } from "@/shared/ui/Button/Button";
import type { Locale } from "@/i18n/routing";

export const Header = observer(() => {
  const t = useTranslations("Header");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const userStore = useUserStore();

  const [mounted,    setMounted]    = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Close on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Close on Esc
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const isAuth        = mounted && userStore.state.isAuth;
  const userFirstName = userStore.state.user?.full_name?.split(" ")[0] ?? "";

  const switchLocale = () => {
    router.replace(pathname, { locale: locale === "en" ? "ru" : "en" });
  };

  const LocaleBtn = ({ className = "" }: { className?: string }) => (
    <button
      onClick={switchLocale}
      aria-label={locale === "en" ? "Switch to Russian" : "Switch to English"}
      className={`min-h-11 flex items-center px-2.5 rounded-lg border border-border text-sm font-medium text-textSecondary hover:text-textMain hover:border-primary transition-colors ${className}`}
    >
      {locale.toUpperCase()}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="flex items-center justify-between max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primaryHover flex items-center justify-center text-onAccent font-bold text-sm">M</span>
          <span className="text-lg font-semibold tracking-tight text-textMain whitespace-nowrap">Metriq Flow</span>
        </Link>

        {/* Desktop center nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm text-textSecondary">
          <a href="#product" className="hover:text-textMain transition-colors">{t("product")}</a>
          <a href="#how" className="hover:text-textMain transition-colors">{t("howItWorks")}</a>
        </nav>

        {/* Desktop right: locale + auth */}
        <div className="hidden md:flex gap-3 items-center shrink-0">
          <LocaleBtn />
          {isAuth ? (
            <>
              <Link href="/app" className="text-sm font-medium text-textMain hover:text-primary transition-colors">
                {userFirstName || "Dashboard"}
              </Link>
              <Button variant="secondary" onClick={() => userStore.logout()}>{t("logout")}</Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-textSecondary hover:text-textMain transition-colors">{t("signIn")}</Link>
              <Link href="/register">
                <Button variant="primary">{t("createAccount")}</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile right: locale + hamburger */}
        <div className="flex items-center gap-2 md:hidden shrink-0">
          <LocaleBtn />
          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-textSecondary hover:bg-surfaceMuted transition-colors"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-bg/95 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
            {/* Nav links */}
            <a
              href="#product"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-3 rounded-lg text-sm text-textSecondary hover:text-textMain hover:bg-surfaceMuted transition-colors"
            >
              {t("product")}
            </a>
            <a
              href="#how"
              onClick={() => setMobileOpen(false)}
              className="px-3 py-3 rounded-lg text-sm text-textSecondary hover:text-textMain hover:bg-surfaceMuted transition-colors"
            >
              {t("howItWorks")}
            </a>

            <div className="my-1 h-px bg-border" />

            {/* Auth links */}
            {isAuth ? (
              <>
                <Link
                  href="/app"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-3 rounded-lg text-sm font-medium text-textMain hover:bg-surfaceMuted transition-colors"
                >
                  {userFirstName || "Dashboard"}
                </Link>
                <button
                  onClick={() => { userStore.logout(); setMobileOpen(false); }}
                  className="px-3 py-3 rounded-lg text-sm text-textSecondary hover:text-textMain hover:bg-surfaceMuted transition-colors text-left"
                >
                  {t("logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-3 rounded-lg text-sm text-textSecondary hover:text-textMain hover:bg-surfaceMuted transition-colors"
                >
                  {t("signIn")}
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-3 rounded-xl text-sm font-semibold bg-primary text-onAccent hover:bg-primaryHover transition-colors text-center"
                >
                  {t("createAccount")}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
});
