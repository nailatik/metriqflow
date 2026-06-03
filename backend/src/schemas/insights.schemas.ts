import { z } from "zod";

export const insightsBodySchema = z.object({
  period: z.enum(["24h", "7d", "30d", "all"]),
  locale: z.enum(["ru", "en"]).default("ru"),
  force:  z.boolean().default(false),
});
