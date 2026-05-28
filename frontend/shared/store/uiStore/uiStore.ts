import { makeAutoObservable } from "mobx";
import type { RootStore } from "../RootStore";
import { initialUiState } from "./models/uiState";
import { uiSync } from "./models/uiSync";

export class UiStore {
  loading: boolean = initialUiState.loading;
  error: string | null = initialUiState.error;
  isErrorModalOpen: boolean = initialUiState.isErrorModalOpen;

  constructor(public root: RootStore) {
    makeAutoObservable(this, { root: false });
  }

  setLoading(value: boolean): void {
    uiSync.setLoading(this, value);
  }

  setError(message: string | null): void {
    uiSync.setError(this, message);
  }

  clearError(): void {
    uiSync.clearError(this);
  }
}
