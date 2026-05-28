import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { CommonWrapper } from "@/widgets/CommonWrapper/CommonWrapper";
import { ThemeProvider } from "@/widgets/ThemeProvider/ThemeProvider";
import { ThemeToggle } from "@/widgets/ThemeToggle/ThemeToggle";
import "@/shared/styles/globals.css";

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

async function loadMessages(locale: string) {
  return (await import(`@/messages/${locale}.json`)).default;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const messages = await loadMessages(locale);
  const t = createTranslator({ locale, namespace: "Landing", messages });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return {
    metadataBase: new URL(siteUrl),
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
      url: "/",
      siteName: "Metriq Flow",
      title: "Metriq Flow",
      description: t("hero.subtitle"),
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Metriq Flow" }],
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

  setRequestLocale(locale);

  const messages = await loadMessages(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NextIntlClientProvider
          locale={locale}
          messages={messages}
          timeZone="UTC"
          now={new Date()}
          formats={{}}
        >
          <ThemeProvider>
            <CommonWrapper>
              {children}
              <ThemeToggle />
            </CommonWrapper>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
