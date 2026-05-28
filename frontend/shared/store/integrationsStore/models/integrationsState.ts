import { makeAutoObservable } from "mobx";
import type { TgAccount, TgChannel } from "@/entities/integration/types";

export class IntegrationsState {
  tgLinked: boolean = false;
  tgAccount: TgAccount | null = null;
  tgChannels: TgChannel[] = [];
  statusLoaded: boolean = false;
  channelsLoaded: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }
}
