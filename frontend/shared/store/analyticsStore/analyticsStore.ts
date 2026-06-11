import type { RootStore } from "../RootStore";
import { AnalyticsState } from "./models/analyticsState";
import { analyticsAsync } from "./models/analyticsAsync";
import { analyticsSync } from "./models/analyticsSync";

export class AnalyticsStore {
  state: AnalyticsState;

  constructor(public root: RootStore) {
    this.state = new AnalyticsState();
  }

  generate(key: string, endpoint: string, period: string, locale: string, force: boolean) {
    return analyticsAsync.generate(this, key, endpoint, period, locale, force);
  }

  reset() {
    analyticsSync.reset(this);
  }
}
