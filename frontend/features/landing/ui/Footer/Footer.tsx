import { getTranslator } from "@/i18n/getTranslator";
import { Link } from "@/i18n/navigation";

export async function Footer({ locale }: { locale: string }) {
  const t = await getTranslator(locale, "Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surfaceMuted/40">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 max-w-xs">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primaryHover flex items-center justify-center text-onAccent font-bold text-sm">M</span>
              <span className="text-lg font-semibold tracking-tight text-textMain">Metriq Flow</span>
            </div>
            <p className="mt-3 text-sm text-textSecondary">{t("tagline")}</p>
            <p className="mt-1 text-sm text-textSecondary">{t("builtFor")}</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-textSecondary">{t("product")}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#product" className="text-textMain hover:text-primary transition-colors">{t("features")}</a></li>
              <li><a href="#how" className="text-textMain hover:text-primary transition-colors">{t("howItWorks")}</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-textSecondary">{t("account")}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/login" className="text-textMain hover:text-primary transition-colors">{t("login")}</Link></li>
              <li><Link href="/register" className="text-textMain hover:text-primary transition-colors">{t("register")}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-textSecondary">{t("legal")}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/legal/privacy" className="text-textMain hover:text-primary transition-colors">{t("privacy")}</Link></li>
              <li><Link href="/legal/consent" className="text-textMain hover:text-primary transition-colors">{t("consent")}</Link></li>
              <li><Link href="/legal/terms" className="text-textMain hover:text-primary transition-colors">{t("terms")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-textSecondary text-center sm:text-left">
            <p>© {year} Metriq Flow. {t("rights")}</p>
            <p className="mt-1">{"{{OPERATOR_NAME}}"}, ИНН {"{{INN}}"}</p>
          </div>
          <p className="text-xs text-textSecondary font-mono">{locale.toUpperCase()}</p>
        </div>
      </div>
    </footer>
  );
}
