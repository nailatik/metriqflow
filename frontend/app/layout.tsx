import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/shared/store/StoreProvider";
import { CommonWrapper } from "@/widgets/CommonWrapper/CommonWrapper";
import { AppInitializer } from "@/widgets/AppInitializer/AppInitializer";

export const metadata: Metadata = {
  title: {
    default: "Metriq Flow — Social Analytics Automated",
    template: "%s | Metriq Flow",
  },
  description:
    "Track performance, generate reports and automate analytics — all in one clean dashboard built for modern teams.",
  keywords: ["social analytics", "SMM", "reports", "dashboard", "marketing"],
  authors: [{ name: "Metriq Flow Team" }],
  creator: "Metriq Flow",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "http://localhost:3000",
    siteName: "Metriq Flow",
    title: "Metriq Flow — Social Analytics Automated",
    description:
      "Track performance, generate reports and automate analytics — all in one clean dashboard built for modern teams.",
    images: [
      {
        url: "http://localhost:3000/og-image.png",
        width: 1200,
        height: 630,
        alt: "Metriq Flow",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Metriq Flow — Social Analytics Automated",
    description: "Track performance, generate reports and automate analytics.",
  },
};

export default function RootAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <AppInitializer>
            <CommonWrapper>
              {children}
            </CommonWrapper>
          </AppInitializer>
        </StoreProvider>
      </body>
    </html>
  );
}
