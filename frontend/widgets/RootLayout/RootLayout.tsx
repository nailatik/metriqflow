"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/widgets/Sidebar/Sidebar";

interface RootLayoutProps {
  children: ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
