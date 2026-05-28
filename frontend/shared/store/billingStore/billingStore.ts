import { computed, makeObservable } from "mobx";
import type { Plan } from "@/entities/user/types";
import { PLAN_LIMITS, type PlanLimits } from "@/shared/lib/plans";
import type { RootStore } from "../RootStore";
import { BillingState } from "./models/billingState";

export class BillingStore {
  state: BillingState;

  constructor(public root: RootStore) {
    this.state = new BillingState();
    makeObservable(this, {
      plan: computed,
      limits: computed,
      planExpiresAt: computed,
    });
  }

  get plan(): Plan {
    return (this.root.userStore.state.user?.plan as Plan) ?? "free";
  }

  get limits(): PlanLimits {
    return PLAN_LIMITS[this.plan] ?? PLAN_LIMITS.free;
  }

  get planExpiresAt(): string | null {
    return this.root.userStore.state.user?.plan_expires_at ?? null;
  }
}
