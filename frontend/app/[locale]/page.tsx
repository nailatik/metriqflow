import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Header } from "@/widgets/Header/Header";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });

  const features = [
    t("features.dashboard.title"),
    t("features.reports.title"),
    t("features.insights.title"),
  ] as const;
  const featureDescs = [
    t("features.dashboard.desc"),
    t("features.reports.desc"),
    t("features.insights.desc"),
  ] as const;

  const steps = [
    { title: t("howItWorks.connect.title"), desc: t("howItWorks.connect.desc") },
    { title: t("howItWorks.analyze.title"), desc: t("howItWorks.analyze.desc") },
    { title: t("howItWorks.get.title"),     desc: t("howItWorks.get.desc") },
  ];

  return (
    <div className="relative text-textMain min-h-screen">
      {/* Background blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[100px] left-[-100px] w-[600px] h-[600px] bg-purple-500/10 blur-3xl rounded-full" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-indigo-500/10 blur-3xl rounded-full" />
      </div>

      <Header />

      {/* Hero */}
      <section className="relative flex flex-col items-center text-center px-8 py-28 max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
          {t("hero.title")} <br />
          <span className="text-primary">{t("hero.titleHighlight")}</span>
        </h1>
        <p className="mt-6 text-textSecondary text-lg max-w-2xl leading-relaxed">
          {t("hero.subtitle")}
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link href="/register" className="px-4 py-2 rounded-xl font-medium bg-primary text-white hover:bg-indigo-700 shadow-sm transition-all">
            {t("hero.startFree")}
          </Link>
          <a href="#features" className="px-4 py-2 rounded-xl font-medium bg-surface text-textMain border border-border hover:bg-border transition-all">
            {t("hero.learnMore")}
          </a>
        </div>
      </section>

      {/* Social proof */}
      <section className="px-8 py-12 border-y border-border text-center text-textSecondary text-sm">
        {t("socialProof")}
      </section>

      {/* Features */}
      <section id="features" className="px-8 py-24 max-w-6xl mx-auto">
        <h3 className="text-3xl font-semibold mb-12 text-center">{t("features.title")}</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((title, i) => (
            <div key={title} className="group relative p-6 rounded-2xl border border-border bg-surface/70 backdrop-blur-md hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
              <h4 className="font-semibold text-lg">{title}</h4>
              <p className="text-textSecondary mt-2">{featureDescs[i]}</p>
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition bg-gradient-to-r from-purple-500/10 to-indigo-500/10" />
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-semibold mb-12">{t("howItWorks.title")}</h3>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            {steps.map(({ title, desc }, i) => (
              <div key={title} className="group relative p-6 rounded-2xl border border-border bg-surface/70 backdrop-blur-md hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
                <p className="text-primary font-semibold">{t("howItWorks.step", { n: i + 1 })}</p>
                <p className="mt-2 font-medium">{title}</p>
                <p className="text-textSecondary mt-1">{desc}</p>
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition bg-gradient-to-r from-purple-500/10 to-indigo-500/10" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-8 py-20 text-center">
        <h3 className="text-4xl font-bold">{t("cta.title")}</h3>
        <p className="text-textSecondary mt-7">{t("cta.subtitle")}</p>
        <div className="mt-7">
          <Link href="/register" className="px-4 py-2 rounded-xl font-medium bg-primary text-white hover:bg-indigo-700 shadow-sm transition-all">
            {t("cta.button")}
          </Link>
        </div>
      </section>
    </div>
  );
}
