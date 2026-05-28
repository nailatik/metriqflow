import type { RootStore } from "../RootStore";
import { IntegrationsState } from "./models/integrationsState";
import { integrationsAsync } from "./models/integrationsAsync";
import { integrationsSync } from "./models/integrationsSync";

export class IntegrationsStore {
  state: IntegrationsState;
  statusInflight: Promise<void> | null = null;
  channelsInflight: Promise<void> | null = null;

  constructor(public root: RootStore) {
    this.state = new IntegrationsState();
  }

  fetchStatus(force = false) {
    return integrationsAsync.fetchStatus(this, force);
  }
  fetchChannels(force = false) {
    return integrationsAsync.fetchChannels(this, force);
  }
  createToken() {
    return integrationsAsync.createToken(this);
  }
  unlink() {
    return integrationsAsync.unlink(this);
  }
  reset() {
    integrationsSync.reset(this);
  }
}
