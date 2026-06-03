import { z } from "zod";

export const insightsBodySchema = z.object({
  period: z.enum(["24h", "7d", "30d", "all"]),
});
