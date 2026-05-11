import { type ReactNode } from "react";
import { AuthWrapper } from "@/widgets/AuthWrapper/AuthWrapper";
import { RootLayout } from "@/widgets/RootLayout/RootLayout";

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AuthWrapper requireAuth>
      <RootLayout>{children}</RootLayout>
    </AuthWrapper>
  );
}
