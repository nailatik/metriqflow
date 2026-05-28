import { runInAction } from "mobx";
import type { UiStore } from "../uiStore";

export const uiSync = {
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
