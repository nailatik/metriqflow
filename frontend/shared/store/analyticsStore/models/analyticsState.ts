import { makeAutoObservable } from "mobx";
import type { InsightEntry } from "../types";

export class AnalyticsState {
  insights: Map<string, InsightEntry> = new Map();

  constructor() {
    makeAutoObservable(this);
  }
}
