import { runInAction } from "mobx";
import type { Competitor } from "@/entities/competitor/types";
import type { CompetitorsStore } from "../competitorsStore";

export const competitorsSync = {
  setList(store: CompetitorsStore, list: Competitor[]): void {
    runInAction(() => {
      store.state.list   = list;
      store.state.loaded = true;
    });
  },
  prepend(store: CompetitorsStore, item: Competitor): void {
    runInAction(() => {
      store.state.list.unshift(item);
    });
  },
  removeById(store: CompetitorsStore, id: number): void {
    runInAction(() => {
      store.state.list = store.state.list.filter((c) => c.id !== id);
    });
  },
  reset(store: CompetitorsStore): void {
    runInAction(() => {
      store.state.list   = [];
      store.state.loaded = false;
    });
  },
};
