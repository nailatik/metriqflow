import { runInAction } from "mobx";
import { integrationsService } from "@/entities/integration/api/integrationsService";
import type { TgTokenData } from "@/entities/integration/types";
import type { IntegrationsStore } from "../index";
import { integrationsSync } from "./integrationsSync";

export const integrationsAsync = {
  async fetchStatus(store: IntegrationsStore, force = false): Promise<void> {
    if (store.statusLoaded && !force) return;
    if (store.statusInflight) return store.statusInflight;
    const promise = (async () => {
      try {
        const res = await integrationsService.getStatus();
        runInAction(() => integrationsSync.setStatus(store, res.data.linked, res.data.account));
      } catch {
        runInAction(() => integrationsSync.setStatus(store, false, null));
      } finally {
        runInAction(() => { store.statusInflight = null; });
      }
    })();
    runInAction(() => { store.statusInflight = promise; });
    return promise;
  },

  async fetchChannels(store: IntegrationsStore, force = false): Promise<void> {
    if (store.channelsLoaded && !force) return;
    if (store.channelsInflight) return store.channelsInflight;
    const promise = (async () => {
      try {
        const res = await integrationsService.getChannels();
        runInAction(() => integrationsSync.setChannels(store, res.data));
      } catch {
        runInAction(() => integrationsSync.setChannels(store, []));
      } finally {
        runInAction(() => { store.channelsInflight = null; });
      }
    })();
    runInAction(() => { store.channelsInflight = promise; });
    return promise;
  },

  async createToken(_store: IntegrationsStore): Promise<TgTokenData | null> {
    try {
      const res = await integrationsService.createToken();
      return res.data;
    } catch {
      return null;
    }
  },

  async unlink(store: IntegrationsStore): Promise<boolean> {
    try {
      await integrationsService.unlink();
      runInAction(() => integrationsSync.clearTg(store));
      return true;
    } catch {
      return false;
    }
  },
};
