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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const userFirstName = userStore.state.user?.full_name?.split(" ")[0] ?? "";

  const switchLocale = (next: Locale) => {
    router.replace(pathname, { locale: next });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center max-w-6xl mx-auto px-6 py-4">
      <Link href="/" className="flex items-center gap-2 justify-self-start">
        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primaryHover flex items-center justify-center text-onAccent font-bold text-sm">M</span>
        <span className="text-lg font-semibold tracking-tight text-textMain">Metriq Flow</span>
      </Link>

      <nav className="hidden md:flex items-center gap-7 text-sm text-textSecondary">
        <a href="#product" className="hover:text-textMain transition-colors">{t("product")}</a>
        <a href="#how" className="hover:text-textMain transition-colors">{t("howItWorks")}</a>
      </nav>

      <div className="flex gap-3 items-center justify-self-end">
        {/* Language switcher — single toggle */}
        <button
          onClick={() => switchLocale(locale === "en" ? "ru" : "en")}
          aria-label={locale === "en" ? "Switch to Russian" : "Switch to English"}
          title={locale === "en" ? "Switch to Русский" : "Switch to English"}
          className="px-2.5 py-1 rounded-lg border border-border text-sm font-medium text-textSecondary hover:text-textMain hover:border-primary transition-colors"
        >
          {locale.toUpperCase()}
        </button>

        {/* Auth state — гостевое до монтирования, чтобы SSR совпадал */}
        {mounted && userStore.state.isAuth ? (
          <>
            <Link href="/app">
              <span className="text-textMain font-medium">{userFirstName || "User"}</span>
            </Link>
            <Button variant="secondary" onClick={() => userStore.logout()}>{t("logout")}</Button>
          </>
        ) : (
          <>
            <Link href="/login" className="hidden sm:inline text-sm text-textSecondary hover:text-textMain transition-colors">{t("signIn")}</Link>
            <Link href="/register">
              <Button variant="primary">{t("createAccount")}</Button>
            </Link>
          </>
        )}
      </div>
      </div>
    </header>
  );
});
