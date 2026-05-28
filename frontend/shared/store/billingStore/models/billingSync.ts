import type { BillingStore } from "../billingStore";

export const billingSync = {
  // billing state is derived from user.plan via computed `plan` getter,
  // so no setters are needed. placeholder for future explicit overrides.
  _noop(_store: BillingStore): void {},
};
