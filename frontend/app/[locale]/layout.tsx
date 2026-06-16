import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { CommonWrapper } from "@/widgets/CommonWrapper/CommonWrapper";
import { ThemeProvider } from "@/widgets/ThemeProvider/ThemeProvider";
import { ThemeToggle } from "@/widgets/ThemeToggle/ThemeToggle";
import { Plus_Jakarta_Sans, Manrope, JetBrains_Mono } from "next/font/google";
import "@/shared/styles/globals.css";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// Plus Jakarta Sans has no Cyrillic glyphs — Manrope fills Cyrillic via per-glyph fallback
const fontSansCyr = Manrope({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-cyr",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

async function loadMessages(locale: string) {
  return (await import(`@/messages/${locale}.json`)).default;
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#D97706" },
    { media: "(prefers-color-scheme: dark)", color: "#F59E0B" },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const messages = await loadMessages(locale);
  const t = createTranslator({ locale, namespace: "Landing", messages });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://metriqflow.com";
  const isRu = locale === "ru";

  const keywords = isRu
    ? ["аналитика соцсетей", "SMM", "аналитика Telegram", "аналитика ВКонтакте", "отчёты", "дашборд", "маркетинг", "Metriq Flow"]
    : ["social analytics", "SMM", "Telegram analytics", "VK analytics", "reports", "dashboard", "marketing", "Metriq Flow"];

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "Metriq Flow - " + t("metaTitle"),
      template: "%s | Metriq Flow",
    },
    description: t("hero.subtitle"),
    keywords,
    authors: [{ name: "Metriq Flow" }],
    creator: "Metriq Flow",
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    icons: {
      icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
      shortcut: "/favicon.svg",
      apple: "/favicon.svg",
    },
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      locale: isRu ? "ru_RU" : "en_US",
      alternateLocale: isRu ? "en_US" : "ru_RU",
      url: `${siteUrl}/${locale}`,
      siteName: "Metriq Flow",
      title: "Metriq Flow — " + t("hero.titleHighlight"),
      description: t("hero.subtitle"),
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Metriq Flow" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Metriq Flow — " + t("hero.titleHighlight"),
      description: t("hero.subtitle"),
      images: ["/og-image.png"],
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
    <html
      lang={locale}
      className={`${fontSans.variable} ${fontSansCyr.variable} ${fontMono.variable}`}
      suppressHydrationWarning
    >
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
