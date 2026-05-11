import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function LocaleNotFound() {
  const t = await getTranslations("Common.notFound");
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-textMain tracking-tight">{t("code")}</h1>
        <h2 className="text-xl font-semibold mt-4 text-textMain">{t("title")}</h2>
        <p className="text-textSecondary mt-2">{t("desc")}</p>
        <div className="mt-6">
          <Link href="/" className="px-6 py-3 rounded-xl font-medium bg-primary text-white hover:bg-indigo-700 shadow-sm transition-all inline-block">
            {t("button")}
          </Link>
        </div>
      </div>
    </div>
  );
}
