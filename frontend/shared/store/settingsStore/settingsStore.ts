import type { RootStore } from "../RootStore";
import type { Theme } from "./types";
import { SettingsState } from "./models/settingsState";
import { settingsSync } from "./models/settingsSync";

export class SettingsStore {
  state: SettingsState;

  constructor(public root: RootStore) {
    this.state = new SettingsState();
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
