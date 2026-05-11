"use client";

import { createContext, useContext, type ReactNode } from "react";
import { getRootStore, type RootStore } from "./RootStore";

const StoreContext = createContext<RootStore | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = getRootStore();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

function useRootStore(): RootStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useRootStore must be used inside StoreProvider");
  return store;
}

export const useUserStore = () => useRootStore().userStore;
export const useReportsStore = () => useRootStore().reportsStore;
export const useUiStore = () => useRootStore().uiStore;
