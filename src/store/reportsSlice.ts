import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { setLoading } from "./settingsSlice";

interface Report {
  id: string;
  title: string;
}

interface ReportsState {
  list: Report[];
}

const initialState: ReportsState = {
  list: [],
};

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {
    setReports(state, action: PayloadAction<Report[]>) {
      state.list = action.payload;
    },
  },
});

export const { setReports } = reportsSlice.actions;

export const fetchReports = () => async (dispatch: any) => {
  dispatch(setLoading(true));

  try {
    const data = [
      { id: "1", title: "Instagram report" },
      { id: "2", title: "Telegram report" },
    ];

    dispatch(setReports(data));
  } finally {
    dispatch(setLoading(false));
  }
};

export default reportsSlice.reducer;