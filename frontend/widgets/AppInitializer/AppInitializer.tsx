"use client";

import { useEffect, type ReactNode } from "react";
import { useUserStore } from "@/shared/store/StoreProvider";

interface AppInitializerProps {
  children: ReactNode;
}

export function AppInitializer({ children }: AppInitializerProps) {
  const userStore = useUserStore();

  useEffect(() => {
    // Если токен есть (из localStorage), но данные пользователя ещё не загружены —
    // делаем единственный запрос /auth/me при старте приложения.
    if (userStore.token && !userStore.user) {
      userStore.fetchMe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
