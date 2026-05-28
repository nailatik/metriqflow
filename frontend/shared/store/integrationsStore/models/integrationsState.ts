import type { IntegrationsState } from "../types";

export const initialIntegrationsState: IntegrationsState = {
  tgLinked: false,
  tgAccount: null,
  tgChannels: [],
  statusLoaded: false,
  channelsLoaded: false,
};
