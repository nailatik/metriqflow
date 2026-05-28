import type { UiStore } from "../uiStore";

export const uiSync = {
  setLoading(store: UiStore, value: boolean): void {
    store.loading = value;
  },

  setError(store: UiStore, message: string | null): void {
    store.error = message;
    store.isErrorModalOpen = !!message;
  },

  clearError(store: UiStore): void {
    store.error = null;
    store.isErrorModalOpen = false;
  },
};
