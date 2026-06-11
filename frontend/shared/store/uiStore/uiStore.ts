import type { RootStore } from "../RootStore";
import { UiState, type ToastKind } from "./models/uiState";
import { uiSync } from "./models/uiSync";

export class UiStore {
  state: UiState;

  readonly sync = {
    showToast: (message: string, kind: ToastKind) => uiSync.showToast(this, message, kind),
    clearToast: (id: number) => uiSync.clearToast(this, id),
    setLoading: (value: boolean) => uiSync.setLoading(this, value),
    setError: (message: string | null) => uiSync.setError(this, message),
    clearError: () => uiSync.clearError(this),
  };

  constructor(public root: RootStore) {
    this.state = new UiState();
  }

  setLoading(value: boolean): void {
    this.sync.setLoading(value);
  }

  setError(message: string | null): void {
    this.sync.setError(message);
  }

  clearError(): void {
    this.sync.clearError();
  }

  showToast(message: string, kind: ToastKind = "info"): void {
    this.sync.showToast(message, kind);
  }

  clearToast(id: number): void {
    this.sync.clearToast(id);
  }
}
