import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { StoreProvider } from "@/shared/store/StoreProvider";
import { CommonWrapper } from "@/widgets/CommonWrapper/CommonWrapper";
import { AppInitializer } from "@/widgets/AppInitializer/AppInitializer";
import { ThemeProvider } from "@/widgets/ThemeProvider/ThemeProvider";
import { ThemeToggle } from "@/widgets/ThemeToggle/ThemeToggle";

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });

  return {
    title: {
      default: "Metriq Flow — " + t("hero.titleHighlight"),
      template: "%s | Metriq Flow",
    },
    description: t("hero.subtitle"),
    keywords: ["social analytics", "SMM", "reports", "dashboard", "marketing"],
    authors: [{ name: "Metriq Flow Team" }],
    creator: "Metriq Flow",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      locale: locale === "ru" ? "ru_RU" : "en_US",
      url: "http://localhost:3000",
      siteName: "Metriq Flow",
      title: "Metriq Flow",
      description: t("hero.subtitle"),
      images: [{ url: "http://localhost:3000/og-image.png", width: 1200, height: 630, alt: "Metriq Flow" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Metriq Flow",
      description: t("hero.subtitle"),
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <StoreProvider>
        <ThemeProvider>
          <AppInitializer>
            <CommonWrapper>
              {children}
              <ThemeToggle />
            </CommonWrapper>
          </AppInitializer>
        </ThemeProvider>
      </StoreProvider>
    </NextIntlClientProvider>
  );
}
