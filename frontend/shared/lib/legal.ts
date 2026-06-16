export const LEGAL_VERSIONS = {
  privacy: { version: "1.0", date: "2026-06-17", dateLabel: "17.06.2026" },
  consent: { version: "1.0", date: "2026-06-17", dateLabel: "17.06.2026" },
  terms: { version: "1.0", date: "2026-06-17", dateLabel: "17.06.2026" },
} as const;

export type LegalDocKey = keyof typeof LEGAL_VERSIONS;
