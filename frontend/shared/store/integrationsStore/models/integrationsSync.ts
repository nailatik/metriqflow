import type { TgAccount, TgChannel } from "@/entities/integration/types";
import type { IntegrationsStore } from "../integrationsStore";

export const integrationsSync = {
  setStatus(store: IntegrationsStore, linked: boolean, account: TgAccount | null): void {
    store.tgLinked = linked;
    store.tgAccount = account;
    store.statusLoaded = true;
  },
  setChannels(store: IntegrationsStore, channels: TgChannel[]): void {
    store.tgChannels = channels;
    store.channelsLoaded = true;
  },
  clearTg(store: IntegrationsStore): void {
    store.tgLinked = false;
    store.tgAccount = null;
    store.tgChannels = [];
  },
  reset(store: IntegrationsStore): void {
    store.tgLinked = false;
    store.tgAccount = null;
    store.tgChannels = [];
    store.statusLoaded = false;
    store.channelsLoaded = false;
  },
};
