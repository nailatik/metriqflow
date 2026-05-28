import { makeAutoObservable } from "mobx";
import type { Community } from "@/entities/community/types";

export class CommunitiesState {
  list: Community[] = [];
  loaded: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }
}
