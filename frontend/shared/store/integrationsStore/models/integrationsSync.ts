import { runInAction } from "mobx";
import type { TgAccount, TgChannel } from "@/entities/integration/types";
import type { IntegrationsStore } from "../integrationsStore";

export const integrationsSync = {
  setStatus(store: IntegrationsStore, linked: boolean, account: TgAccount | null): void {
    runInAction(() => {
      store.state.tgLinked = linked;
      store.state.tgAccount = account;
      store.state.statusLoaded = true;
    });
  },
  setChannels(store: IntegrationsStore, channels: TgChannel[]): void {
    runInAction(() => {
      store.state.tgChannels = channels;
      store.state.channelsLoaded = true;
    });
  },
  clearTg(store: IntegrationsStore): void {
    runInAction(() => {
      store.state.tgLinked = false;
      store.state.tgAccount = null;
      store.state.tgChannels = [];
    });
  },
  reset(store: IntegrationsStore): void {
    runInAction(() => {
      store.state.tgLinked = false;
      store.state.tgAccount = null;
      store.state.tgChannels = [];
      store.state.statusLoaded = false;
      store.state.channelsLoaded = false;
    });
  },
};
