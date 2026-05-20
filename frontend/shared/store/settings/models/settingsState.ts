export type Theme = "light" | "dark";

export interface SettingsState {
  theme: Theme;
  hydrated: boolean;
}

export const initialSettingsState: SettingsState = {
  theme: "light",
  hydrated: false,
};
