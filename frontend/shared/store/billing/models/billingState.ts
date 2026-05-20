import type { Plan } from "@/entities/user/types";

export interface BillingState {
  currentPlan: Plan;
}

export const initialBillingState: BillingState = {
  currentPlan: "free",
};
