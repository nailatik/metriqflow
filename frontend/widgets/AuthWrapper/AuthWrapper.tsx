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

  useEffect(() => {
    if (!mounted) return;
    if (requireAuth && !userStore.state.token) {
      router.replace("/login");
      return;
    }
    if (redirectIfAuth && userStore.state.token) {
      router.replace("/app");
      return;
    }
    if (
      requireAuth &&
      userStore.state.user &&
      userStore.state.user.email_verified === false &&
      !pathname.startsWith("/verify-email")
    ) {
      router.replace("/verify-email");
    }
  }, [mounted, userStore.state.token, userStore.state.user, requireAuth, redirectIfAuth, router, pathname]);

  if (!mounted) return null;
  if (requireAuth && !userStore.state.token) return null;
  if (redirectIfAuth && userStore.state.token) return null;

  return <>{children}</>;
});
