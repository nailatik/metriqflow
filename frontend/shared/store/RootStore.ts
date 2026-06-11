import { UiStore } from "./uiStore/uiStore";
import { UserStore } from "./userStore/userStore";
import { ReportsStore } from "./reportsStore/reportsStore";
import { SchedulesStore } from "./schedulesStore/schedulesStore";
import { IntegrationsStore } from "./integrationsStore/integrationsStore";
import { CommunitiesStore } from "./communitiesStore/communitiesStore";
import { CompetitorsStore } from "./competitorsStore/competitorsStore";
import { BillingStore } from "./billingStore/billingStore";
import { SettingsStore } from "./settingsStore/settingsStore";
import { AnalyticsStore } from "./analyticsStore/analyticsStore";

export class RootStore {
  uiStore: UiStore;
  userStore: UserStore;
  reportsStore: ReportsStore;
  schedulesStore: SchedulesStore;
  integrationsStore: IntegrationsStore;
  communitiesStore: CommunitiesStore;
  competitorsStore: CompetitorsStore;
  billingStore: BillingStore;
  settingsStore: SettingsStore;
  analyticsStore: AnalyticsStore;

  constructor() {
    this.uiStore = new UiStore(this);
    this.userStore = new UserStore(this);
    this.reportsStore = new ReportsStore(this);
    this.schedulesStore = new SchedulesStore(this);
    this.integrationsStore = new IntegrationsStore(this);
    this.communitiesStore = new CommunitiesStore(this);
    this.competitorsStore = new CompetitorsStore(this);
    this.billingStore = new BillingStore(this);
    this.settingsStore = new SettingsStore(this);
    this.analyticsStore = new AnalyticsStore(this);
  }

  reset(): void {
    this.reportsStore.reset();
    this.schedulesStore.reset();
    this.integrationsStore.reset();
    this.communitiesStore.reset();
    this.competitorsStore.reset();
    this.analyticsStore.reset();
  }
}

const rootStore: RootStore = new RootStore();

export function getRootStore(): RootStore {
  return rootStore;
}
