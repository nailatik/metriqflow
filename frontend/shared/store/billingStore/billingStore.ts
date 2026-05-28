import { makeAutoObservable } from "mobx";
import type { Plan } from "@/entities/user/types";
import { PLAN_LIMITS, type PlanLimits } from "@/shared/lib/plans";
import type { RootStore } from "../RootStore";

export class BillingStore {
  constructor(public root: RootStore) {
    makeAutoObservable(this, { root: false });
  }

  get plan(): Plan {
    return (this.root.userStore.user?.plan as Plan) ?? "free";
  }

  get limits(): PlanLimits {
    return PLAN_LIMITS[this.plan] ?? PLAN_LIMITS.free;
  }

  get planExpiresAt(): string | null {
    return this.root.userStore.user?.plan_expires_at ?? null;
  }
}
