import { runInAction } from "mobx";
import type { UiStore } from "../uiStore";
import type { ToastKind } from "./uiState";

export const uiSync = {
  showToast(store: UiStore, message: string, kind: ToastKind): void {
    runInAction(() => {
      store.state.toast = { id: Date.now(), message, kind };
    });
  },

  clearToast(store: UiStore, id: number): void {
    runInAction(() => {
      // Only clear if it's still the same toast (a newer one may have replaced it).
      if (store.state.toast?.id === id) store.state.toast = null;
    });
  },

  setLoading(store: UiStore, value: boolean): void {
    runInAction(() => {
      store.state.loading = value;
    });
  },

  setError(store: UiStore, message: string | null): void {
    runInAction(() => {
      store.state.error = message;
      store.state.isErrorModalOpen = !!message;
    });
  },

  clearError(store: UiStore): void {
    runInAction(() => {
      store.state.error = null;
      store.state.isErrorModalOpen = false;
    });
  },
};
