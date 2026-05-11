import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ru"] as const,
  defaultLocale: "en",
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
