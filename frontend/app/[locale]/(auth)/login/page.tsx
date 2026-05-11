import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthWrapper } from "@/widgets/AuthWrapper/AuthWrapper";
import { LoginForm } from "@/features/auth/ui/LoginForm/LoginForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Login" });
  return { title: t("title") };
}

export default function LoginPage() {
  return (
    <AuthWrapper redirectIfAuth>
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-4">
        <Link href="/" className="mb-8">
          <h1 className="text-4xl text-primary font-semibold tracking-tight">Metriq Flow</h1>
        </Link>
        <LoginForm />
      </div>
    </AuthWrapper>
  );
}
