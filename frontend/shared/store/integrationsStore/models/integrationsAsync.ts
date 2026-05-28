import { integrationsService } from "@/entities/integration/api/integrationsService";
import type { TgTokenData } from "@/entities/integration/types";
import type { IntegrationsStore } from "../integrationsStore";
import { integrationsSync } from "./integrationsSync";

export const integrationsAsync = {
  async fetchStatus(store: IntegrationsStore, force = false): Promise<void> {
    if (store.state.statusLoaded && !force) return;
    if (store.statusInflight) return store.statusInflight;
    const promise = (async () => {
      try {
        const res = await integrationsService.getStatus();
        integrationsSync.setStatus(store, res.data.linked, res.data.account);
      } catch {
        integrationsSync.setStatus(store, false, null);
      } finally {
        store.statusInflight = null;
      }
    })();
    store.statusInflight = promise;
    return promise;
  },

  async fetchChannels(store: IntegrationsStore, force = false): Promise<void> {
    if (store.state.channelsLoaded && !force) return;
    if (store.channelsInflight) return store.channelsInflight;
    const promise = (async () => {
      try {
        const res = await integrationsService.getChannels();
        integrationsSync.setChannels(store, res.data);
      } catch {
        integrationsSync.setChannels(store, []);
      } finally {
        store.channelsInflight = null;
      }
    })();
    store.channelsInflight = promise;
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
      integrationsSync.clearTg(store);
      return true;
    } catch {
      return false;
    }
  },
};
