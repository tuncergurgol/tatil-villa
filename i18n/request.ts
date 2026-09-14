import { getRequestConfig } from "next-intl/server";
import { routing, type AppLocale } from "./routing";
import { messages } from "@/lib/i18n/messages";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as AppLocale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: messages[locale as AppLocale],
  };
});
