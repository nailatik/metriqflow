import { makeAutoObservable } from "mobx";
import type { Report } from "@/entities/report/types";

export class ReportsState {
  list: Report[] = [];
  loaded: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }
}
