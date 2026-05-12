"use client";

import { type ReactNode } from "react";
import { Sidebar } from "@/widgets/Sidebar/Sidebar";

interface RootLayoutProps {
  children: ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
