import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { AuthWrapper } from "@/widgets/AuthWrapper/AuthWrapper";
import { RegisterForm } from "@/features/auth/ui/RegisterForm/RegisterForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Register.step1" });
  return { title: t("title") };
}

export default function RegisterPage() {
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
