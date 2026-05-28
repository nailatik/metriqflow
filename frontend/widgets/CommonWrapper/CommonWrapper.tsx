"use client";

import { useEffect, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { Loader } from "@/widgets/Loader/Loader";
import { ErrorModal } from "@/widgets/ErrorModal/ErrorModal";
import { useUserStore } from "@/shared/store/StoreProvider";

interface CommonWrapperProps {
  children: ReactNode;
}

export const CommonWrapper = observer(({ children }: CommonWrapperProps) => {
  const userStore = useUserStore();

  // Hydrate /auth/me whenever we have a token but no user yet — covers public
  // routes (landing) where AuthWrapper isn't mounted.
  useEffect(() => {
    if (userStore.token && !userStore.user) {
      userStore.fetchMe();
    }
  }, [userStore, userStore.token, userStore.user]);

  return (
    <>
      <Loader />
      <ErrorModal />
      {children}
    </>
  );
});
