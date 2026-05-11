"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import { useUserStore } from "@/shared/store/StoreProvider";

interface AuthWrapperProps {
  children: ReactNode;
  /** If true — redirect authenticated users away (for login/register pages) */
  redirectIfAuth?: boolean;
  /** If true — redirect unauthenticated users to /login (for protected pages) */
  requireAuth?: boolean;
}

export const AuthWrapper = observer(({
  children,
  redirectIfAuth = false,
  requireAuth = false,
}: AuthWrapperProps) => {
  const router = useRouter();
  const userStore = useUserStore();

  useEffect(() => {
    if (requireAuth && !userStore.token) {
      router.replace("/login");
    }
    if (redirectIfAuth && userStore.token) {
      router.replace("/app");
    }
  }, [userStore.token, requireAuth, redirectIfAuth, router]);

  if (requireAuth && !userStore.token) return null;
  if (redirectIfAuth && userStore.token) return null;

  return <>{children}</>;
});
