import type { Metadata } from "next";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslator } from "@/i18n/getTranslator";
import { Link } from "@/i18n/navigation";
import { AuthWrapper } from "@/widgets/AuthWrapper/AuthWrapper";
import { RegisterForm } from "@/features/auth/ui/RegisterForm/RegisterForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslator(locale, "Register.step1");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AuthWrapper redirectIfAuth>
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg px-4">
        <Link href="/" className="mb-8">
          <h1 className="text-4xl text-primary font-semibold tracking-tight">Metriq Flow</h1>
        </Link>
        <Suspense>
          <RegisterForm />
        </Suspense>
      </div>
    </AuthWrapper>
  );
}
