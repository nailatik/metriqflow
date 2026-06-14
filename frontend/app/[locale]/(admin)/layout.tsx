import { type ReactNode } from "react";
import type { Metadata } from "next";
import { AdminWrapper } from "@/widgets/AdminWrapper/AdminWrapper";
import { AdminShell } from "@/widgets/AdminShell/AdminShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AdminWrapper>
      <AdminShell>{children}</AdminShell>
    </AdminWrapper>
  );
}
