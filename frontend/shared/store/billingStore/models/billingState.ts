import { makeAutoObservable } from "mobx";
import type { Plan } from "@/entities/user/types";

export class BillingState {
  currentPlan: Plan = "free";

  constructor() {
    makeAutoObservable(this);
  }
}
