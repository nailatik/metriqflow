import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import "./globals.css";

// Root layout — owns <html> and <body>.
// Reads locale from next-intl middleware so we can set lang attribute here.
// All providers live in app/[locale]/layout.tsx (nested layout, no html/body).
export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
