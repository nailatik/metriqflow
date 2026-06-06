import { http } from "@/shared/lib/axios";
import type { Competitor } from "../types";

export const competitorsService = {
  getCompetitors: () =>
    http.get<Competitor[]>("/competitors"),
  addCompetitor: (platform: "tg" | "vk", identifier: string) =>
    http.post<Competitor, { platform: string; identifier: string }>("/competitors", { platform, identifier }),
  removeCompetitor: (id: number) =>
    http.delete(`/competitors/${id}`),
};
