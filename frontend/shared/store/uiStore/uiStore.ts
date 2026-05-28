import type { RootStore } from "../RootStore";
import { UiState } from "./models/uiState";
import { uiSync } from "./models/uiSync";

export class UiStore {
  state: UiState;

  constructor(public root: RootStore) {
    this.state = new UiState();
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
