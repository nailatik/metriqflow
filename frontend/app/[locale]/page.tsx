import { setRequestLocale } from "next-intl/server";
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

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-bg text-textMain">
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
