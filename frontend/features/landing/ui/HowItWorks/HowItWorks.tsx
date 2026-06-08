import { getTranslator } from "@/i18n/getTranslator";
import { Reveal } from "../Reveal/Reveal";

const ICONS = [
  // connect — link
  <path key="c" d="M9 17H7A5 5 0 0 1 7 7h2m6 0h2a5 5 0 0 1 0 10h-2M8 12h8" />,
  // analyze — bars
  <path key="a" d="M3 3v18h18M8 17v-5m5 5V8m5 9v-8" />,
  // grow — trending up
  <path key="g" d="M3 17l6-6 4 4 8-8M21 7h-4m4 0v4" />,
];

export async function HowItWorks({ locale }: { locale: string }) {
  const t = await getTranslator(locale, "Landing.howItWorks");
  const steps = ["connect", "analyze", "grow"] as const;

  return (
    <section id="how" className="scroll-mt-20 border-t border-border bg-surfaceMuted/40">
      <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
        <Reveal className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t("eyebrow")}</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-textMain">{t("title")}</h2>
        </Reveal>

        <div className="mt-14 grid md:grid-cols-3 gap-6 relative">
          {/* connecting line on desktop */}
          <div aria-hidden className="hidden md:block absolute top-7 left-[16.66%] right-[16.66%] h-px bg-border" />
          {steps.map((step, i) => (
            <Reveal key={step} delay={i * 120} className="relative">
              <div className="flex flex-col items-center text-center">
                <span className="relative z-10 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface border border-border text-primary shadow-card">
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{ICONS[i]}</svg>
                </span>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-primary">{t("step", { n: i + 1 })}</p>
                <h3 className="mt-1.5 text-lg font-semibold text-textMain">{t(`${step}.title`)}</h3>
                <p className="mt-2 text-sm text-textSecondary leading-relaxed max-w-xs">{t(`${step}.desc`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
