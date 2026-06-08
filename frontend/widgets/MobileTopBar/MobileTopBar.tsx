"use client";

import { type RefObject } from "react";
import { observer } from "mobx-react-lite";
import { useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useUserStore } from "@/shared/store/StoreProvider";
import type { Locale } from "@/i18n/routing";

interface MobileTopBarProps {
  onOpenDrawer: () => void;
  drawerOpen: boolean;
  hamburgerRef: RefObject<HTMLButtonElement | null>;
}

export const MobileTopBar = observer(({ onOpenDrawer, drawerOpen, hamburgerRef }: MobileTopBarProps) => {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const userStore = useUserStore();

  const switchLocale = () => {
    const next = locale === "en" ? "ru" : "en";
    router.replace(pathname, { locale: next });
  };

  const user = userStore.state.user;
  const initial =
    user?.full_name?.charAt(0)?.toUpperCase() ??
    user?.email?.charAt(0)?.toUpperCase() ??
    "?";

  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center gap-2 h-14 px-3 bg-surface border-b border-border flex-shrink-0">
      <button
        ref={hamburgerRef}
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open menu"
        aria-expanded={drawerOpen}
        aria-controls="sidebar"
        className="flex items-center justify-center w-11 h-11 rounded-lg text-textSecondary hover:bg-surfaceMuted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <Link href="/" className="flex items-center gap-2 flex-1 min-w-0">
        <span className="w-8 h-8 flex-shrink-0 rounded-lg bg-gradient-to-br from-primary to-primaryHover grid place-items-center text-onAccent font-bold text-sm select-none">
          M
        </span>
        <span className="text-[17px] font-semibold tracking-tight text-textMain truncate">
          Metriq Flow
        </span>
      </Link>

      <button
        type="button"
        onClick={switchLocale}
        aria-label={locale === "en" ? "Switch to Russian" : "Switch to English"}
        className="flex items-center justify-center w-11 h-11 rounded-lg text-textSecondary hover:bg-surfaceMuted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 text-xs font-semibold"
      >
        {locale.toUpperCase()}
      </button>

      <Link
        href="/app"
        aria-label="Profile"
        className="flex items-center justify-center w-11 h-11 rounded-lg hover:bg-surfaceMuted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-semibold text-sm grid place-items-center select-none">
          {initial}
        </span>
      </Link>
    </header>
  );
});
