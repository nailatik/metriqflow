import type { Metadata } from "next";
import Link from "next/link";
import { AuthWrapper } from "@/widgets/AuthWrapper/AuthWrapper";
import { LoginForm } from "@/features/auth/ui/LoginForm/LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your Metriq Flow account.",
};

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
