import { communitiesService } from "@/entities/community/api/communitiesService";
import type { CommunitiesStore } from "../communitiesStore";
import type { AddCommunityResult } from "../types";
import { communitiesSync } from "./communitiesSync";

export const communitiesAsync = {
  async fetch(store: CommunitiesStore, force = false): Promise<void> {
    if (store.state.loaded && !force) return;
    if (store.inflight) return store.inflight;
    const promise = (async () => {
      try {
        const res = await communitiesService.getCommunities();
        communitiesSync.setList(store, res.data);
      } catch {
        communitiesSync.setList(store, []);
      } finally {
        store.inflight = null;
      }
    })();
    store.inflight = promise;
    return promise;
  },

  async add(store: CommunitiesStore, group_id: string): Promise<AddCommunityResult> {
    try {
      const res = await communitiesService.addCommunity(group_id);
      communitiesSync.prepend(store, res.data);
      return { ok: true, community: res.data };
    } catch (e: unknown) {
      const resp = (e as { response?: { status?: number; data?: { message?: string; code?: number; upgrade?: boolean } } })?.response;
      if (resp?.status === 403 && resp?.data?.upgrade) {
        return { ok: false, upgrade: true };
      }
      return { ok: false, code: resp?.data?.code, message: resp?.data?.message };
    }
  },

  async remove(store: CommunitiesStore, id: number): Promise<boolean> {
    try {
      await communitiesService.removeCommunity(id);
      communitiesSync.removeById(store, id);
      return true;
    } catch {
      return false;
    }
  },
};
