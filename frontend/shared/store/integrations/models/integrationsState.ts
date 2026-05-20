import type { TgAccount, TgChannel } from "@/entities/integration/types";

export interface IntegrationsState {
  tgLinked: boolean;
  tgAccount: TgAccount | null;
  tgChannels: TgChannel[];
  statusLoaded: boolean;
  channelsLoaded: boolean;
}

export const initialIntegrationsState: IntegrationsState = {
  tgLinked: false,
  tgAccount: null,
  tgChannels: [],
  statusLoaded: false,
  channelsLoaded: false,
};
