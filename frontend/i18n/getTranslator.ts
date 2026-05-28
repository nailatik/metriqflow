import { createTranslator } from "next-intl";

export async function getTranslator(locale: string, namespace?: string) {
  const messages = (await import(`@/messages/${locale}.json`)).default;
  return createTranslator({ locale, namespace, messages });
}
