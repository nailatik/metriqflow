import { makeAutoObservable } from "mobx";
import type { RootStore } from "../RootStore";
import type { Theme } from "./types";
import { initialSettingsState } from "./models/settingsState";
import { settingsSync } from "./models/settingsSync";

export class SettingsStore {
  theme: Theme = initialSettingsState.theme;
  hydrated: boolean = initialSettingsState.hydrated;

  constructor(public root: RootStore) {
    makeAutoObservable(this, { root: false });
  }

  hydrate(): void {
    settingsSync.hydrate(this);
  }
  setTheme(theme: Theme): void {
    settingsSync.setTheme(this, theme);
  }
  toggleTheme(): void {
    settingsSync.toggleTheme(this);
  }
}
