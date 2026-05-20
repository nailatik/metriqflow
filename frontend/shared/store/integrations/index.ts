import { makeAutoObservable } from "mobx";
import type { TgAccount, TgChannel } from "@/entities/integration/types";
import type { RootStore } from "../RootStore";
import { initialIntegrationsState } from "./models/integrationsState";
import { integrationsAsync } from "./models/integrationsAsync";
import { integrationsSync } from "./models/integrationsSync";

export class IntegrationsStore {
  tgLinked: boolean = initialIntegrationsState.tgLinked;
  tgAccount: TgAccount | null = initialIntegrationsState.tgAccount;
  tgChannels: TgChannel[] = initialIntegrationsState.tgChannels;
  statusLoaded: boolean = initialIntegrationsState.statusLoaded;
  channelsLoaded: boolean = initialIntegrationsState.channelsLoaded;
  statusInflight: Promise<void> | null = null;
  channelsInflight: Promise<void> | null = null;

  constructor(public root: RootStore) {
    makeAutoObservable(this, {
      root: false,
      statusInflight: false,
      channelsInflight: false,
    });
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
