import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslator } from "@/i18n/getTranslator";
import { Header } from "@/widgets/Header/Header";
import { Hero } from "@/features/landing/ui/Hero/Hero";
import { PlatformStrip } from "@/features/landing/ui/PlatformStrip/PlatformStrip";
import { FeatureShowcase } from "@/features/landing/ui/FeatureShowcase/FeatureShowcase";
import { HowItWorks } from "@/features/landing/ui/HowItWorks/HowItWorks";
import { FinalCTA } from "@/features/landing/ui/FinalCTA/FinalCTA";
import { Footer } from "@/features/landing/ui/Footer/Footer";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://metriqflow.com";
  const t = await getTranslator(locale, "Landing.hero");

  return {
    alternates: {
      canonical: `${siteUrl}/${locale}`,
      languages: {
        en: `${siteUrl}/en`,
        ru: `${siteUrl}/ru`,
        "x-default": `${siteUrl}/en`,
      },
    },
    openGraph: {
      url: `${siteUrl}/${locale}`,
      title: `Metriq Flow — ${t("titleHighlight")}`,
      description: t("subtitle"),
    },
  };
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://metriqflow.com";
  const t = await getTranslator(locale, "Landing.hero");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "Metriq Flow",
        inLanguage: ["en", "ru"],
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/en/register` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#app`,
        name: "Metriq Flow",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: siteUrl,
        description: t("subtitle"),
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        featureList: [
          "Telegram analytics",
          "VK analytics",
          "Competitor benchmarks",
          "Automated reports",
          "AI insights",
        ],
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#org`,
        name: "Metriq Flow",
        url: siteUrl,
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/favicon.svg`,
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-bg text-textMain">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main>
        <Hero locale={locale} />
        <PlatformStrip locale={locale} />
        <FeatureShowcase locale={locale} />
        <HowItWorks locale={locale} />
        <FinalCTA locale={locale} />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
