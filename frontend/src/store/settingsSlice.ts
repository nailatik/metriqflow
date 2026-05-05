import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface SettingsState {
  loading: boolean;
  error: string | null;
  isErrorModalOpen: boolean;
}

const initialState: SettingsState = {
  loading: false,
  error: null,
  isErrorModalOpen: false,
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.isErrorModalOpen = !!action.payload;
    },

    clearError(state) {
      state.error = null;
      state.isErrorModalOpen = false;
    },
  },
});

export const { setLoading, setError, clearError } = settingsSlice.actions;
export default settingsSlice.reducer;