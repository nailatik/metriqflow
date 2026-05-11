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

  const userFirstName = userStore.user?.full_name?.split(" ")[0] ?? "";

  const switchLocale = (next: Locale) => {
    router.replace(pathname, { locale: next });
  };

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center px-8 py-6 border-b border-border">
      <h1 className="text-xl font-semibold tracking-tight justify-self-start">
        <Link href="/">Metriq Flow</Link>
      </h1>

      <nav className="flex items-center gap-6 text-textSecondary">
        <a href="#features" className="hover:text-textMain">{t("features")}</a>
        <a href="#how" className="hover:text-textMain">{t("howItWorks")}</a>
      </nav>

      <div className="flex gap-3 items-center justify-self-end">
        {/* Language switcher — single toggle */}
        <button
          onClick={() => switchLocale(locale === "en" ? "ru" : "en")}
          title={locale === "en" ? "Switch to Русский" : "Switch to English"}
          className="px-2.5 py-1 rounded-lg border border-border text-sm font-medium text-textSecondary hover:text-textMain hover:border-primary transition-colors"
        >
          {locale.toUpperCase()}
        </button>

        {/* Auth state — гостевое до монтирования, чтобы SSR совпадал */}
        {mounted && userStore.isAuth ? (
          <>
            <Link href="/app">
              <span className="text-textMain font-medium">{userFirstName || "User"}</span>
            </Link>
            <Button variant="secondary" onClick={() => userStore.logout()}>{t("logout")}</Button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-textSecondary hover:text-textMain">{t("login")}</Link>
            <Link href="/register">
              <Button variant="primary">{t("createAccount")}</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
});
