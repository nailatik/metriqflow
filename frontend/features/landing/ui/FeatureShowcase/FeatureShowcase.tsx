import type { ComponentType } from "react";
import { getTranslator } from "@/i18n/getTranslator";
import { DashboardMock, InsightsMock, CompetitorsMock, PlannerMock, ReportMock } from "../mocks/Mocks";
import { Reveal } from "../Reveal/Reveal";

const ROWS: { key: string; Mock: ComponentType }[] = [
  { key: "analytics", Mock: DashboardMock },
  { key: "insights", Mock: InsightsMock },
  { key: "competitors", Mock: CompetitorsMock },
  { key: "planner", Mock: PlannerMock },
  { key: "reports", Mock: ReportMock },
];

export async function FeatureShowcase({ locale }: { locale: string }) {
  const t = await getTranslator(locale, "Landing.showcase");

  return (
    <section id="product" className="scroll-mt-20">
      <div className="max-w-6xl mx-auto px-6 py-20 sm:py-28">
        <Reveal className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t("eyebrow")}</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-textMain">{t("title")}</h2>
          <p className="mt-4 text-lg text-textSecondary">{t("subtitle")}</p>
        </Reveal>

        <div className="mt-16 sm:mt-20 space-y-20 sm:space-y-28">
          {ROWS.map(({ key, Mock }, i) => {
            const mediaRight = i % 2 === 0;
            const points = t.raw(`${key}.points`) as string[];
            return (
              <Reveal key={key}>
                <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
                  <div className={mediaRight ? "lg:order-1" : "lg:order-2"}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">{t(`${key}.eyebrow`)}</p>
                    <h3 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-textMain">{t(`${key}.title`)}</h3>
                    <p className="mt-4 text-textSecondary leading-relaxed">{t(`${key}.desc`)}</p>
                    <ul className="mt-6 space-y-2.5">
                      {points.map((p) => (
                        <li key={p} className="flex items-start gap-2.5 text-sm text-textMain">
                          <span className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-success/10 text-success shrink-0">
                            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                          </span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={mediaRight ? "lg:order-2" : "lg:order-1"}>
                    <div className="lg:max-w-md mx-auto w-full">
                      <Mock />
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
