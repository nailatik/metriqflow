export type Theme = "light" | "dark";

export interface SettingsState {
  theme: Theme;
  hydrated: boolean;
}
