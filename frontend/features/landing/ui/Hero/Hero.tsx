import { getTranslator } from "@/i18n/getTranslator";
import { Link } from "@/i18n/navigation";
import { DashboardMock } from "../mocks/Mocks";
import { Reveal } from "../Reveal/Reveal";

export async function Hero({ locale }: { locale: string }) {
  const t = await getTranslator(locale, "Landing.hero");

  return (
    <section className="relative overflow-hidden">
      {/* warm ambient glow — on-brand, replaces old purple blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[560px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-44 -right-32 w-[440px] h-[440px] rounded-full bg-chart2/10 blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-14 sm:pt-20 pb-12 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-10 items-center">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-textSecondary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {t("badge")}
          </span>

          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.12] text-textMain">
            {t("title")}
            <br className="hidden sm:block" />{" "}
            <span className="text-primary">{t("titleHighlight")}</span>
          </h1>

          <p className="mt-5 text-lg text-textSecondary leading-relaxed max-w-xl mx-auto lg:mx-0">
            {t("subtitle")}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold bg-primary text-onAccent hover:bg-primaryHover shadow-card transition-all w-full sm:w-auto"
            >
              {t("startFree")}
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
            <a
              href="#product"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold bg-surface border border-border text-textMain hover:bg-surfaceMuted transition-all w-full sm:w-auto"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" /></svg>
              {t("seeInAction")}
            </a>
          </div>
        </div>

        <Reveal className="relative">
          <div className="animate-float">
            <DashboardMock />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
