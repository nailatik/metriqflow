import type { TgAccount, TgChannel } from "@/entities/integration/types";
import type { RootStore } from "../RootStore";
import { IntegrationsState } from "./models/integrationsState";
import { integrationsAsync } from "./models/integrationsAsync";
import { integrationsSync } from "./models/integrationsSync";

export class IntegrationsStore {
  state: IntegrationsState;
  statusInflight: Promise<void> | null = null;
  channelsInflight: Promise<void> | null = null;

  readonly sync = {
    setStatus: (linked: boolean, account: TgAccount | null) =>
      integrationsSync.setStatus(this, linked, account),
    setChannels: (channels: TgChannel[]) => integrationsSync.setChannels(this, channels),
    clearTg: () => integrationsSync.clearTg(this),
    reset: () => integrationsSync.reset(this),
  };

  readonly async = {
    fetchStatus: (force = false) => integrationsAsync.fetchStatus(this, force),
    fetchChannels: (force = false) => integrationsAsync.fetchChannels(this, force),
    createToken: () => integrationsAsync.createToken(this),
    unlink: () => integrationsAsync.unlink(this),
  };

  constructor(public root: RootStore) {
    this.state = new IntegrationsState();
  }

  fetchStatus(force = false) {
    return this.async.fetchStatus(force);
  }
  fetchChannels(force = false) {
    return this.async.fetchChannels(force);
  }
  createToken() {
    return this.async.createToken();
  }
  unlink() {
    return this.async.unlink();
  }
  reset() {
    this.sync.reset();
  }
}
