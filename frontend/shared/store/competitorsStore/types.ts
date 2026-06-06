import type { Competitor } from "@/entities/competitor/types";

export type AddCompetitorResult =
  | { ok: true; competitor: Competitor }
  | { ok: false; upgrade: true }
  | { ok: false; message?: string };
