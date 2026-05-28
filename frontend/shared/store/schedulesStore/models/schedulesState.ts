import { makeAutoObservable } from "mobx";
import type { Schedule } from "@/entities/schedule/types";

export class SchedulesState {
  list: Schedule[] = [];
  loaded: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }
}
