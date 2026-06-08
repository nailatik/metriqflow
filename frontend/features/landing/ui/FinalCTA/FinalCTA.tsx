import { getTranslator } from "@/i18n/getTranslator";
import { Link } from "@/i18n/navigation";
import { Reveal } from "../Reveal/Reveal";

export async function FinalCTA({ locale }: { locale: string }) {
  const t = await getTranslator(locale, "Landing.cta");

  return (
    <section className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-14 sm:px-12 sm:py-20 text-center shadow-card">
          {/* amber wash */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-primary/10 blur-3xl" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-textMain max-w-2xl mx-auto">{t("title")}</h2>
          <p className="mt-4 text-lg text-textSecondary max-w-xl mx-auto">{t("subtitle")}</p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold bg-primary text-onAccent hover:bg-primaryHover shadow-card transition-all"
            >
              {t("button")}
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
