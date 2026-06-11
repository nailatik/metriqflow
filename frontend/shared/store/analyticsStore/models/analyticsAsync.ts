import { http } from "@/shared/lib/axios";
import type { AnalyticsStore } from "../analyticsStore";
import type { InsightsPayload, Metriqs } from "../types";
import { analyticsSync } from "./analyticsSync";

type InsightsResponse = InsightsPayload & { cached: boolean; metriqs?: Metriqs };
type ErrorData = { message?: string; code?: string; metriqs?: Metriqs };

export const analyticsAsync = {
  async generate(
    store: AnalyticsStore,
    key: string,
    endpoint: string,
    period: string,
    locale: string,
    force: boolean,
  ): Promise<void> {
    analyticsSync.setLoading(store, key, true);
    try {
      const res = await http.post<InsightsResponse>(endpoint, { period, locale, force });
      const { cached, metriqs, ...rest } = res.data;
      analyticsSync.setPayload(store, key, rest as InsightsPayload, cached, metriqs ?? null);
    } catch (e: unknown) {
      const resp = (e as { response?: { data?: ErrorData } })?.response?.data;
      analyticsSync.setError(
        store,
        key,
        { message: resp?.message ?? "Error generating insights", code: resp?.code },
        resp?.metriqs ?? null,
      );
    }
  },
};
