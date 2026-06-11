import { runInAction } from "mobx";
import type { AnalyticsStore } from "../analyticsStore";
import type { InsightsPayload, Metriqs } from "../types";

function getOrCreate(store: AnalyticsStore, key: string) {
  if (!store.state.insights.has(key)) {
    store.state.insights.set(key, {
      loading: false, payload: null, cached: false, metriqs: null, error: null,
    });
  }
  return store.state.insights.get(key)!;
}

export const analyticsSync = {
  setLoading(store: AnalyticsStore, key: string, loading: boolean): void {
    runInAction(() => {
      getOrCreate(store, key).loading = loading;
    });
  },

  setPayload(
    store: AnalyticsStore,
    key: string,
    payload: InsightsPayload,
    cached: boolean,
    metriqs: Metriqs | null,
  ): void {
    runInAction(() => {
      const e   = getOrCreate(store, key);
      e.payload = payload;
      e.cached  = cached;
      e.error   = null;
      e.loading = false;
      if (metriqs) e.metriqs = metriqs;
    });
  },

  setError(
    store: AnalyticsStore,
    key: string,
    error: { message: string; code?: string },
    metriqs: Metriqs | null,
  ): void {
    runInAction(() => {
      const e   = getOrCreate(store, key);
      e.error   = error;
      e.loading = false;
      if (metriqs) e.metriqs = metriqs;
    });
  },

  reset(store: AnalyticsStore): void {
    runInAction(() => {
      store.state.insights.clear();
    });
  },
};
