"use client";

import { type ReactNode } from "react";
import { Loader } from "@/widgets/Loader/Loader";
import { ErrorModal } from "@/widgets/ErrorModal/ErrorModal";

interface CommonWrapperProps {
  children: ReactNode;
}

export function CommonWrapper({ children }: CommonWrapperProps) {
  return (
    <>
      <Loader />
      <ErrorModal />
      {children}
    </>
  );
}
