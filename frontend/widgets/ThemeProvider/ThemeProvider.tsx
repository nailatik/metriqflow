"use client";

import { useEffect, type ReactNode } from "react";
import { useSettingsStore } from "@/shared/store/StoreProvider";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const settingsStore = useSettingsStore();

  useEffect(() => {
    settingsStore.hydrate();
  }, [settingsStore]);

  return <>{children}</>;
}
