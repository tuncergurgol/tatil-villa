export const SMTP_PROVIDER_PRESETS = {
  google: {
    label: "Google / Gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: "starttls" as const,
    helpText:
      "Gmail ve Google Workspace için SMTP: smtp.gmail.com, port 587, STARTTLS.",
  },
} as const;

export type SmtpProviderId = keyof typeof SMTP_PROVIDER_PRESETS;

export type SmtpSecureMode = "starttls" | "ssl";

export function getSmtpProviderPreset(provider: string) {
  if (provider in SMTP_PROVIDER_PRESETS) {
    return SMTP_PROVIDER_PRESETS[provider as SmtpProviderId];
  }
  return SMTP_PROVIDER_PRESETS.google;
}

export function getSortedSmtpProviderOptions() {
  return Object.entries(SMTP_PROVIDER_PRESETS)
    .map(([value, preset]) => ({ value, label: preset.label }))
    .sort((a, b) => a.label.localeCompare(b.label, "tr", { sensitivity: "base" }));
}

export function getSmtpSecureLabel(mode: string) {
  if (mode === "ssl") return "SSL (465)";
  return "STARTTLS (587)";
}
