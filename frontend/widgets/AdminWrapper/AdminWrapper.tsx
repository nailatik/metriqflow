"use client";

import { useEffect, useState, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { useRouter } from "@/i18n/navigation";
import { useUserStore } from "@/shared/store/StoreProvider";

interface AdminWrapperProps {
  children: ReactNode;
}

export const AdminWrapper = observer(({ children }: AdminWrapperProps) => {
  const router = useRouter();
  const userStore = useUserStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!userStore.state.token) {
      router.replace("/login");
      return;
    }

    if (userStore.state.user && !userStore.state.user.is_admin) {
      router.replace("/app");
    }
  }, [mounted, userStore.state.token, userStore.state.user, router]);

  if (!mounted) return null;
  if (!userStore.state.token) return null;
  if (userStore.state.user && !userStore.state.user.is_admin) return null;

  return <>{children}</>;
});
