import { getRootStore } from "./RootStore";

export const useUserStore     = () => getRootStore().userStore;
export const useReportsStore  = () => getRootStore().reportsStore;
export const useSchedulesStore = () => getRootStore().schedulesStore;
export const useUiStore       = () => getRootStore().uiStore;
