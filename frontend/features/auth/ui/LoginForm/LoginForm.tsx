"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { observer } from "mobx-react-lite";
import { useRouter, Link } from "@/i18n/navigation";
import { useUserStore, useUiStore } from "@/shared/store/StoreProvider";
import { Button } from "@/shared/ui/Button/Button";
import { Input } from "@/shared/ui/Input/Input";

export const LoginForm = observer(() => {
  const t = useTranslations("Login");
  const router = useRouter();
  const userStore = useUserStore();
  const uiStore = useUiStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const ok = await userStore.login(email, password);
    if (ok) {
      router.push("/app");
    } else {
      setError(t("invalidCredentials"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-textMain">{t("title")}</h1>
        <p className="text-textSecondary mt-2 text-sm">{t("subtitle")}</p>
      </div>

      <div className="space-y-4">
        <Input
          label={t("email")}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label={t("password")}
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className="text-sm text-red-500 text-center -mb-1">{error}</p>
        )}

        <Button variant="primary" disabled={uiStore.loading} type="submit" className="w-full">
          {uiStore.loading ? t("loading") : t("submit")}
        </Button>
      </div>

      <p className="text-center text-sm text-textSecondary mt-6">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-primary hover:underline">
          {t("signUp")}
        </Link>
      </p>
    </form>
  );
});
