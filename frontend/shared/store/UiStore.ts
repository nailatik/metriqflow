import { makeAutoObservable } from "mobx";
import type { RootStore } from "./RootStore";

export class UiStore {
  loading: boolean = false;
  error: string | null = null;
  isErrorModalOpen: boolean = false;

  constructor(private root: RootStore) {
    makeAutoObservable(this);
  }

  setLoading(value: boolean): void {
    this.loading = value;
  }

  setError(message: string | null): void {
    this.error = message;
    this.isErrorModalOpen = !!message;
  }

  clearError(): void {
    this.error = null;
    this.isErrorModalOpen = false;
  }
}
