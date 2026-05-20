import { http } from "@/shared/lib/axios";
import type { TgStatus, TgChannel, TgTokenData } from "../types";

export const integrationsService = {
  getStatus: () => http.get<TgStatus>("/integrations/telegram/status"),
  getChannels: () => http.get<TgChannel[]>("/integrations/telegram/channels"),
  createToken: () => http.post<TgTokenData>("/integrations/telegram/token"),
  unlink: () => http.delete("/integrations/telegram/unlink"),
};
