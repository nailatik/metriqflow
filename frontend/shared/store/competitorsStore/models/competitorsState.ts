import { makeAutoObservable } from "mobx";
import type { Competitor } from "@/entities/competitor/types";

export class CompetitorsState {
  list:   Competitor[] = [];
  loaded: boolean      = false;

  constructor() {
    makeAutoObservable(this);
  }
}
