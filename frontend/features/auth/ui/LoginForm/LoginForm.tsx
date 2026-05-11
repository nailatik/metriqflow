"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useUserStore, useUiStore } from "@/shared/store/StoreProvider";
import { Button } from "@/shared/ui/Button/Button";
import { Input } from "@/shared/ui/Input/Input";

export const LoginForm = observer(() => {
  const router = useRouter();
  const userStore = useUserStore();
  const uiStore = useUiStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await userStore.login(email, password);
    if (ok) router.push("/app");
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md bg-white border border-border rounded-2xl p-8 shadow-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-textMain">Welcome back</h1>
        <p className="text-textSecondary mt-2 text-sm">Sign in to Metriq Flow</p>
      </div>

      <div className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button variant="primary" disabled={uiStore.loading} type="submit" className="w-full">
          {uiStore.loading ? "Signing in..." : "Sign in"}
        </Button>
      </div>

      <p className="text-center text-sm text-textSecondary mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
});
