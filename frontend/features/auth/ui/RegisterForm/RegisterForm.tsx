"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { observer } from "mobx-react-lite";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { useRouter, Link } from "@/i18n/navigation";
import { useUserStore, useUiStore } from "@/shared/store/StoreProvider";
import { Button } from "@/shared/ui/Button/Button";
import { Input } from "@/shared/ui/Input/Input";
import {
  validateEmail,
  validatePassword,
  getPasswordChecks,
} from "@/shared/lib/validation";

type Errors = Partial<Record<"email" | "password" | "fullName" | "birthDate" | "phone" | "agreement", string>>;

export const RegisterForm = observer(() => {
  const t = useTranslations("Register");
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = searchParams.get("step") === "2" ? 2 : 1;

  const locale = useLocale();
  const userStore = useUserStore();
  const uiStore = useUiStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formData, setFormData] = useState({
    fullName: "",
    birthDate: "",
    organization: "",
    phone: "",
    agreedToProcessing: false,
  });

  const handleChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStep1 = () => {
    const emailKey = validateEmail(email);
    const passKey = validatePassword(password);
    if (emailKey || passKey) {
      setErrors({
        email: emailKey ? t(`errors.${emailKey}`) : undefined,
        password: passKey ? t(`errors.${passKey}`) : undefined,
      });
      return;
    }
    setErrors({});
    sessionStorage.setItem("reg_email", email);
    sessionStorage.setItem("reg_password", password);
    router.push("/register?step=2");
  };

  const handleStep2 = async () => {
    const storedEmail = sessionStorage.getItem("reg_email");
    const storedPassword = sessionStorage.getItem("reg_password");

    if (!storedEmail || !storedPassword) {
      router.push("/register");
      return;
    }

    const newErrors: Errors = {};
    if (!formData.fullName) newErrors.fullName = t("errors.fullName");
    if (!formData.birthDate) newErrors.birthDate = t("errors.birthDate");
    if (!formData.phone) newErrors.phone = t("errors.phone");
    if (!formData.agreedToProcessing) newErrors.agreement = t("errors.agreement");

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const ok = await userStore.register({
      email: storedEmail,
      password: storedPassword,
      locale,
      fullName: formData.fullName,
      birthDate: formData.birthDate,
      organization: formData.organization || undefined,
      phone: formData.phone,
      agreedToProcessing: formData.agreedToProcessing,
    });

    if (ok) {
      sessionStorage.removeItem("reg_email");
      sessionStorage.removeItem("reg_password");
      router.push("/verify-email");
    }
  };

  const checks = getPasswordChecks(password);

  if (step === 2) {
    const storedEmail = typeof window !== "undefined" ? sessionStorage.getItem("reg_email") : null;
    if (!storedEmail) {
      router.replace("/register");
      return null;
    }

    return (
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-textMain">{t("step2.title")}</h1>
          <p className="text-textSecondary mt-2 text-sm">{t("step2.subtitle")}</p>
        </div>

        <div className="space-y-4">
          <Input
            label={`${t("step2.fullName")} *`}
            placeholder="Ivan Ivanov"
            value={formData.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            error={errors.fullName}
          />

          <Input
            label={`${t("step2.birthDate")} *`}
            type="date"
            max="2100-12-31"
            value={formData.birthDate}
            onChange={(e) => handleChange("birthDate", e.target.value)}
            error={errors.birthDate}
          />

          <Input
            label={t("step2.organization")}
            placeholder="Company name"
            value={formData.organization}
            onChange={(e) => handleChange("organization", e.target.value)}
          />

          <div>
            <label className="text-sm text-textSecondary">{t("step2.phone")} *</label>
            <div className="mt-1">
              <PhoneInput
                defaultCountry="ru"
                placeholder="+7 (999) 123-45-67"
                value={formData.phone}
                onChange={(phone) => handleChange("phone", phone)}
                inputClassName="w-full px-4 py-3 border border-border rounded-xl outline-none focus:border-primary"
              />
            </div>
            {errors.phone && <p className="text-error text-sm mt-1">{errors.phone}</p>}
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agreed"
              checked={formData.agreedToProcessing}
              onChange={(e) => handleChange("agreedToProcessing", e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="agreed" className="text-sm text-textSecondary">
              {t("step2.agreement")} *
            </label>
          </div>
          {errors.agreement && <p className="text-error text-sm">{errors.agreement}</p>}

          <Button variant="primary" disabled={uiStore.state.loading} onClick={handleStep2} className="w-full">
            {uiStore.state.loading ? t("step2.loading") : t("step2.submit")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-textMain">{t("step1.title")}</h1>
        <p className="text-textSecondary mt-2 text-sm">{t("step1.subtitle")}</p>
      </div>

      <div className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />

        <div>
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
          {password && (
            <div className="mt-2 space-y-1 text-sm">
              <p className={checks.minLength ? "text-green-500" : "text-red-400"}>
                {checks.minLength ? "✔" : "✖"} {t("validation.minLength")}
              </p>
              <p className={checks.uppercase ? "text-green-500" : "text-red-400"}>
                {checks.uppercase ? "✔" : "✖"} {t("validation.uppercase")}
              </p>
              <p className={checks.special ? "text-green-500" : "text-red-400"}>
                {checks.special ? "✔" : "✖"} {t("validation.special")}
              </p>
            </div>
          )}
        </div>

        <Button variant="primary" disabled={uiStore.state.loading} onClick={handleStep1} className="w-full">
          {uiStore.state.loading ? t("step1.loading") : t("step1.next")}
        </Button>
      </div>

      <p className="text-center text-sm text-textSecondary mt-6">
        {t("step1.hasAccount")}{" "}
        <Link href="/login" className="text-primary hover:underline">{t("step1.signIn")}</Link>
      </p>
    </div>
  );
});
