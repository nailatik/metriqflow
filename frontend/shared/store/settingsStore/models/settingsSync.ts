import { runInAction } from "mobx";
import type { SettingsStore } from "../settingsStore";
import type { Theme } from "../types";

const THEME_KEY = "theme";

function applyDom(theme: Theme): void {
  if (typeof document === "undefined") return;
  if (theme === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}

export const settingsSync = {
  hydrate(store: SettingsStore): void {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    const preferred: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const resolved: Theme = stored ?? preferred;
    runInAction(() => {
      store.state.theme = resolved;
      store.state.hydrated = true;
    });
    applyDom(resolved);
  },

  setTheme(store: SettingsStore, theme: Theme): void {
    runInAction(() => {
      store.state.theme = theme;
    });
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_KEY, theme);
    }
    applyDom(theme);
  },

  toggleTheme(store: SettingsStore): void {
    const next: Theme = store.state.theme === "light" ? "dark" : "light";
    settingsSync.setTheme(store, next);
  },
};
