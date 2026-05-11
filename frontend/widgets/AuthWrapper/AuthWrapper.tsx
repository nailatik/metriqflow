"use client";

import { useEffect, useState, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { useRouter } from "@/i18n/navigation";
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
  const userStore = useUserStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (requireAuth && !userStore.token) router.replace("/login");
    if (redirectIfAuth && userStore.token) router.replace("/app");
  }, [mounted, userStore.token, requireAuth, redirectIfAuth, router]);

  if (!mounted) return null;
  if (requireAuth && !userStore.token) return null;
  if (redirectIfAuth && userStore.token) return null;

  return <>{children}</>;
});
