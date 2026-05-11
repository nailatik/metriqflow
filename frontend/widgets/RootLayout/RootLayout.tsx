"use client";

import { useEffect, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { useUserStore } from "@/shared/store/StoreProvider";
import { Sidebar } from "@/widgets/Sidebar/Sidebar";
import { ErrorModal } from "@/widgets/ErrorModal/ErrorModal";

interface RootLayoutProps {
  children: ReactNode;
}

export const RootLayout = observer(({ children }: RootLayoutProps) => {
  const userStore = useUserStore();

  useEffect(() => {
    if (userStore.token && !userStore.user) {
      userStore.fetchMe();
    }
  }, [userStore]);

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
      <ErrorModal />
    </div>
  );
});
