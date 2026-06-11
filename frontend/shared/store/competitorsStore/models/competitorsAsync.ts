import { competitorsService } from "@/entities/competitor/api/competitorsService";
import type { CompetitorsStore } from "../competitorsStore";
import type { AddCompetitorResult } from "../types";
import { competitorsSync } from "./competitorsSync";

export const competitorsAsync = {
  async fetch(store: CompetitorsStore, force = false): Promise<void> {
    if (store.state.loaded && !force) return;
    if (store.inflight) return store.inflight;
    const promise = (async () => {
      try {
        const res = await competitorsService.getCompetitors();
        competitorsSync.setList(store, res.data);
      } catch {
        store.root.uiStore.setError("Failed to load competitors");
      } finally {
        store.inflight = null;
      }
    })();
    store.inflight = promise;
    return promise;
  },

  async add(
    store: CompetitorsStore,
    platform: "tg" | "vk",
    identifier: string,
  ): Promise<AddCompetitorResult> {
    try {
      const res = await competitorsService.addCompetitor(platform, identifier);
      competitorsSync.prepend(store, res.data);
      return { ok: true, competitor: res.data };
    } catch (e: unknown) {
      const resp = (e as { response?: { status?: number; data?: { message?: string; upgrade?: boolean } } })?.response;
      if (resp?.status === 403 && resp?.data?.upgrade) {
        return { ok: false, upgrade: true };
      }
      return { ok: false, message: resp?.data?.message };
    }
  },

  async remove(store: CompetitorsStore, id: number): Promise<boolean> {
    try {
      await competitorsService.removeCompetitor(id);
      competitorsSync.removeById(store, id);
      return true;
    } catch {
      return false;
    }
  },
};
