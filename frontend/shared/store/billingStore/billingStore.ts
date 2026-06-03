import { computed, makeObservable } from "mobx";
import type { Plan } from "@/entities/user/types";
import { PLAN_LIMITS, type PlanLimits } from "@/shared/lib/plans";
import { api } from "@/shared/lib/axios";
import type { RootStore } from "../RootStore";
import { BillingState } from "./models/billingState";

export type RedeemResult =
  | { ok: true; plan: string; plan_expires_at: string | null; already?: boolean }
  | { ok: false; error: "code_invalid" | "network" | "unknown" };

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

  async redeem(code: string): Promise<RedeemResult> {
    try {
      const res = await api.post<{ plan: string; plan_expires_at: string | null; already?: boolean }>(
        "/subscription/redeem",
        { code }
      );
      await this.root.userStore.fetchMe();
      return { ok: true, plan: res.data.plan, plan_expires_at: res.data.plan_expires_at, already: res.data.already };
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) return { ok: false, error: "code_invalid" };
      if (!status) return { ok: false, error: "network" };
      return { ok: false, error: "unknown" };
    }
  }
}
