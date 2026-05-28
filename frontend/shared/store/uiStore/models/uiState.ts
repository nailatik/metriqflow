import { makeAutoObservable } from "mobx";

export class UiState {
  loading: boolean = false;
  error: string | null = null;
  isErrorModalOpen: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }
}
