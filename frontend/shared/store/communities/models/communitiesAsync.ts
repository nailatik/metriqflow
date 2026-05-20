import { runInAction } from "mobx";
import { communitiesService } from "@/entities/community/api/communitiesService";
import type { Community } from "@/entities/community/types";
import type { CommunitiesStore } from "../index";
import { communitiesSync } from "./communitiesSync";

export type AddCommunityResult =
  | { ok: true; community: Community }
  | { ok: false; upgrade: true }
  | { ok: false; code?: number; message?: string };

export const communitiesAsync = {
  async fetch(store: CommunitiesStore, force = false): Promise<void> {
    if (store.loaded && !force) return;
    if (store.inflight) return store.inflight;
    const promise = (async () => {
      try {
        const res = await communitiesService.getCommunities();
        runInAction(() => communitiesSync.setList(store, res.data));
      } catch {
        runInAction(() => communitiesSync.setList(store, []));
      } finally {
        runInAction(() => { store.inflight = null; });
      }
    })();
    runInAction(() => { store.inflight = promise; });
    return promise;
  },

  async add(store: CommunitiesStore, group_id: string): Promise<AddCommunityResult> {
    try {
      const res = await communitiesService.addCommunity(group_id);
      runInAction(() => communitiesSync.prepend(store, res.data));
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
      runInAction(() => communitiesSync.removeById(store, id));
      return true;
    } catch {
      return false;
    }
  },
};
