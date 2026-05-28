import { makeAutoObservable } from "mobx";
import type { Theme } from "../types";

export class SettingsState {
  theme: Theme = "light";
  hydrated: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }
}
