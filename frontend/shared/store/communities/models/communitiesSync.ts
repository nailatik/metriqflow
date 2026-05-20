import type { Community } from "@/entities/community/types";
import type { CommunitiesStore } from "../index";

export const communitiesSync = {
  setList(store: CommunitiesStore, list: Community[]): void {
    store.list = list;
    store.loaded = true;
  },
  prepend(store: CommunitiesStore, item: Community): void {
    store.list.unshift(item);
  },
  removeById(store: CommunitiesStore, id: number): void {
    store.list = store.list.filter((c) => c.id !== id);
  },
  reset(store: CommunitiesStore): void {
    store.list = [];
    store.loaded = false;
  },
};
