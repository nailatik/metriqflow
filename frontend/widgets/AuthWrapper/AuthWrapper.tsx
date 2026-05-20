"use client";

import { useEffect, useState, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useUserStore } from "@/shared/store/StoreProvider";

interface AuthWrapperProps {
  children: ReactNode;
  redirectIfAuth?: boolean;
  requireAuth?: boolean;
}

export const AuthWrapper = observer(({
  children,
  redirectIfAuth = false,
  requireAuth = false,
}: AuthWrapperProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const userStore = useUserStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch /auth/me only when this wrapper actually guards an authenticated route
  // and we have a token but no user yet. Single source of truth — no duplicates.
  useEffect(() => {
    if (!mounted) return;
    if (!requireAuth) return;
    if (userStore.token && !userStore.user) {
      userStore.fetchMe();
    }
  }, [mounted, requireAuth, userStore, userStore.token, userStore.user]);

  useEffect(() => {
    if (!mounted) return;
    if (requireAuth && !userStore.token) {
      router.replace("/login");
      return;
    }
    if (redirectIfAuth && userStore.token) {
      router.replace("/app");
      return;
    }
    if (
      requireAuth &&
      userStore.user &&
      userStore.user.email_verified === false &&
      !pathname.startsWith("/verify-email")
    ) {
      router.replace("/verify-email");
    }
  }, [mounted, userStore.token, userStore.user, requireAuth, redirectIfAuth, router, pathname]);

  if (!mounted) return null;
  if (requireAuth && !userStore.token) return null;
  if (redirectIfAuth && userStore.token) return null;

  return <>{children}</>;
});
