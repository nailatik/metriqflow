"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { usePathname } from "@/i18n/navigation";
import { Sidebar } from "@/widgets/Sidebar/Sidebar";
import { MobileTopBar } from "@/widgets/MobileTopBar/MobileTopBar";
import { useIsDesktop } from "@/shared/hooks/useMediaQuery";
import { useLockBodyScroll } from "@/shared/hooks/useLockBodyScroll";
import { useUserStore } from "@/shared/store/StoreProvider";

interface RootLayoutProps {
  children: ReactNode;
}

export const RootLayout = observer(({ children }: RootLayoutProps) => {
  const userStore = useUserStore();
  const userId = userStore.state.user?.id;
  const lsKey = userId != null ? `sidebar_collapsed_${userId}` : null;

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // Read collapse pref in useEffect (not useState) to avoid hydration mismatch
  useEffect(() => {
    if (!lsKey) return;
    setCollapsed(localStorage.getItem(lsKey) === "1");
  }, [lsKey]);

  // Auto-close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Auto-close drawer when viewport becomes desktop (lg)
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false);
  }, [isDesktop]);

  const toggle = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      if (lsKey) localStorage.setItem(lsKey, next ? "1" : "0");
      return next;
    });
  }, [lsKey]);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    // Return focus to hamburger button
    requestAnimationFrame(() => hamburgerRef.current?.focus());
  }, []);

  useLockBodyScroll(drawerOpen);

  return (
    <div className="flex min-h-dvh overflow-hidden bg-bg">
      <Sidebar
        collapsed={collapsed}
        onToggle={toggle}
        drawerOpen={drawerOpen}
        onCloseDrawer={closeDrawer}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <MobileTopBar
          onOpenDrawer={openDrawer}
          drawerOpen={drawerOpen}
          hamburgerRef={hamburgerRef}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
});
