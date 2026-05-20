export interface UiState {
  loading: boolean;
  error: string | null;
  isErrorModalOpen: boolean;
}

export const initialUiState: UiState = {
  loading: false,
  error: null,
  isErrorModalOpen: false,
};
