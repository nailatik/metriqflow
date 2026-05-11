import { UiStore } from "./UiStore";
import { UserStore } from "@/entities/user/model/UserStore";
import { ReportsStore } from "@/entities/report/model/ReportsStore";

export class RootStore {
  uiStore: UiStore;
  userStore: UserStore;
  reportsStore: ReportsStore;

  constructor() {
    this.uiStore = new UiStore(this);
    this.userStore = new UserStore(this);
    this.reportsStore = new ReportsStore(this);
  }
}

let _store: RootStore | null = null;

export function getRootStore(): RootStore {
  if (!_store) {
    _store = new RootStore();
  }
  return _store;
}
