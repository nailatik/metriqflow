import type { RootStore } from "../RootStore";
import type { Theme } from "./types";
import { SettingsState } from "./models/settingsState";
import { settingsSync } from "./models/settingsSync";

export class SettingsStore {
  state: SettingsState;

  readonly sync = {
    hydrate: () => settingsSync.hydrate(this),
    setTheme: (theme: Theme) => settingsSync.setTheme(this, theme),
    toggleTheme: () => settingsSync.toggleTheme(this),
  };

  constructor(public root: RootStore) {
    this.state = new SettingsState();
  }

  hydrate(): void {
    this.sync.hydrate();
  }
  setTheme(theme: Theme): void {
    this.sync.setTheme(theme);
  }
  toggleTheme(): void {
    this.sync.toggleTheme();
  }
}
