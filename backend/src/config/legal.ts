// Mirrors frontend/shared/lib/legal.ts — keep version bumps in sync on both sides.
export const LEGAL_VERSIONS = {
  privacy: "1.0",
  consent: "1.0",
  terms: "1.0",
} as const;

export type ConsentType = "pdn" | "terms" | "marketing";
