import type { TgAccount, TgChannel } from "@/entities/integration/types";

export interface IntegrationsState {
  tgLinked: boolean;
  tgAccount: TgAccount | null;
  tgChannels: TgChannel[];
  statusLoaded: boolean;
  channelsLoaded: boolean;
}
