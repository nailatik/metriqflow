import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthWrapper } from "@/widgets/AuthWrapper/AuthWrapper";
import { RegisterForm } from "@/features/auth/ui/RegisterForm/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a new Metriq Flow account.",
};

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
