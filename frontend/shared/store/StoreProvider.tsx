import { getRootStore } from "./RootStore";

export const useRootStore         = () => getRootStore();
export const useUiStore           = () => getRootStore().uiStore;
export const useUserStore         = () => getRootStore().userStore;
export const useReportsStore      = () => getRootStore().reportsStore;
export const useSchedulesStore    = () => getRootStore().schedulesStore;
export const useIntegrationsStore = () => getRootStore().integrationsStore;
export const useCommunitiesStore  = () => getRootStore().communitiesStore;
export const useBillingStore      = () => getRootStore().billingStore;
export const useSettingsStore     = () => getRootStore().settingsStore;
