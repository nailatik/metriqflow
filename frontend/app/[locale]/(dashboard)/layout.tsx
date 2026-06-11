import { type ReactNode } from "react";
import type { Metadata } from "next";
import { AuthWrapper } from "@/widgets/AuthWrapper/AuthWrapper";
import { RootLayout } from "@/widgets/RootLayout/RootLayout";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AuthWrapper requireAuth>
      <RootLayout>{children}</RootLayout>
    </AuthWrapper>
  );
}
