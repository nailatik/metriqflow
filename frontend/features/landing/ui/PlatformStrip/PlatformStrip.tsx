import { getTranslator } from "@/i18n/getTranslator";
import { TelegramIcon, VKIcon, YouTubeIcon, InstagramIcon, TikTokIcon } from "../brand/PlatformIcons";
import { Reveal } from "../Reveal/Reveal";

const PLATFORMS = [
  { name: "Telegram", Icon: TelegramIcon, live: true },
  { name: "VK", Icon: VKIcon, live: true },
  { name: "YouTube", Icon: YouTubeIcon, live: false },
  { name: "Instagram", Icon: InstagramIcon, live: false },
  { name: "TikTok", Icon: TikTokIcon, live: false },
] as const;

export async function PlatformStrip({ locale }: { locale: string }) {
  const t = await getTranslator(locale, "Landing.platforms");

  return (
    <section className="border-y border-border bg-surfaceMuted/40">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-lg sm:text-xl font-semibold text-textMain">{t("title")}</h2>
          <p className="mt-2 text-sm text-textSecondary">{t("subtitle")}</p>
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PLATFORMS.map(({ name, Icon, live }, i) => (
            <Reveal key={name} delay={i * 60}>
              <div className={`relative h-full rounded-xl border bg-surface px-4 py-5 flex flex-col items-center gap-2.5 text-center transition-colors ${live ? "border-border" : "border-dashed border-border"}`}>
                <Icon className={`w-7 h-7 ${live ? "text-primary" : "text-textSecondary/50"}`} />
                <span className={`text-sm font-medium ${live ? "text-textMain" : "text-textSecondary"}`}>{name}</span>
                {live ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    {t("available")}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-textSecondary px-2 py-0.5 rounded-full bg-surfaceMuted border border-border">
                    {t("soon")}
                  </span>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
