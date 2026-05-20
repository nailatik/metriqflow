import { UiStore } from "./ui";
import { UserStore } from "./user";
import { ReportsStore } from "./reports";
import { SchedulesStore } from "./schedules";
import { IntegrationsStore } from "./integrations";
import { CommunitiesStore } from "./communities";
import { BillingStore } from "./billing";
import { SettingsStore } from "./settings";

export class RootStore {
  uiStore: UiStore;
  userStore: UserStore;
  reportsStore: ReportsStore;
  schedulesStore: SchedulesStore;
  integrationsStore: IntegrationsStore;
  communitiesStore: CommunitiesStore;
  billingStore: BillingStore;
  settingsStore: SettingsStore;

  constructor() {
    this.uiStore = new UiStore(this);
    this.userStore = new UserStore(this);
    this.reportsStore = new ReportsStore(this);
    this.schedulesStore = new SchedulesStore(this);
    this.integrationsStore = new IntegrationsStore(this);
    this.communitiesStore = new CommunitiesStore(this);
    this.billingStore = new BillingStore(this);
    this.settingsStore = new SettingsStore(this);
  }

  reset(): void {
    this.reportsStore.reset();
    this.schedulesStore.reset();
    this.integrationsStore.reset();
    this.communitiesStore.reset();
  }
}

let _store: RootStore | null = null;

export function getRootStore(): RootStore {
  if (typeof window === "undefined") {
    // On the server we create a fresh instance per call so state never leaks between requests.
    return new RootStore();
  }
  if (!_store) {
    _store = new RootStore();
  }
  return _store;
}
