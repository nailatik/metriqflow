import { makeAutoObservable } from "mobx";

export type ToastKind = "success" | "error" | "info";
export type Toast = { id: number; message: string; kind: ToastKind };

export class UiState {
  loading: boolean = false;
  error: string | null = null;
  isErrorModalOpen: boolean = false;
  toast: Toast | null = null;

  constructor() {
    makeAutoObservable(this);
  }
}
