import { runInAction } from "mobx";
import type { Community } from "@/entities/community/types";
import type { CommunitiesStore } from "../communitiesStore";

export const communitiesSync = {
  setList(store: CommunitiesStore, list: Community[]): void {
    runInAction(() => {
      store.state.list = list;
      store.state.loaded = true;
    });
  },
  prepend(store: CommunitiesStore, item: Community): void {
    runInAction(() => {
      store.state.list.unshift(item);
    });
  },
  removeById(store: CommunitiesStore, id: number): void {
    runInAction(() => {
      store.state.list = store.state.list.filter((c) => c.id !== id);
    });
  },
  reset(store: CommunitiesStore): void {
    runInAction(() => {
      store.state.list = [];
      store.state.loaded = false;
    });
  },
};
