import type { RootStore } from "../RootStore";
import type { InsightsPayload, Metriqs } from "./types";
import { AnalyticsState } from "./models/analyticsState";
import { analyticsAsync } from "./models/analyticsAsync";
import { analyticsSync } from "./models/analyticsSync";

export class AnalyticsStore {
  state: AnalyticsState;

  readonly sync = {
    setLoading: (key: string, loading: boolean) => analyticsSync.setLoading(this, key, loading),
    setPayload: (key: string, payload: InsightsPayload, cached: boolean, metriqs: Metriqs | null) =>
      analyticsSync.setPayload(this, key, payload, cached, metriqs),
    setError: (key: string, error: { message: string; code?: string }, metriqs: Metriqs | null) =>
      analyticsSync.setError(this, key, error, metriqs),
    reset: () => analyticsSync.reset(this),
  };

  readonly async = {
    generate: (key: string, endpoint: string, period: string, locale: string, force: boolean) =>
      analyticsAsync.generate(this, key, endpoint, period, locale, force),
  };

  constructor(public root: RootStore) {
    this.state = new AnalyticsState();
  }

  generate(key: string, endpoint: string, period: string, locale: string, force: boolean) {
    return this.async.generate(key, endpoint, period, locale, force);
  }

  reset() {
    this.sync.reset();
  }
}
