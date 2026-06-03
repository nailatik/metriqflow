"use client";

import { useEffect, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { Loader } from "@/widgets/Loader/Loader";
import { ErrorModal } from "@/widgets/ErrorModal/ErrorModal";
import { Toast } from "@/widgets/Toast/Toast";
import { useUserStore } from "@/shared/store/StoreProvider";

interface CommonWrapperProps {
  children: ReactNode;
}

export const CommonWrapper = observer(({ children }: CommonWrapperProps) => {
  const userStore = useUserStore();

  // Hydrate /auth/me whenever we have a token but no user yet — covers public
  // routes (landing) where AuthWrapper isn't mounted.
  useEffect(() => {
    if (userStore.state.token && !userStore.state.user) {
      userStore.fetchMe();
    }
  }, [userStore, userStore.state.token, userStore.state.user]);

  return (
    <>
      <Loader />
      <ErrorModal />
      <Toast />
      {children}
    </>
  );
});
