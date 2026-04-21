import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { reportsService, type Report } from "../services/reportsService";
import { setLoading, setError } from "./settingsSlice";

interface ReportsState {
  list: Report[];
 "error": string | null;
}

const initialState: ReportsState = {
  list: [],
  error: null,
};

export const fetchReports = createAsyncThunk<
  Report[],
  void,
  { rejectValue: string }
>("reports/fetchReports", async (_, { dispatch, rejectWithValue }) => {
  dispatch(setLoading(true));
  try {
    const res = await reportsService.getReports();
    dispatch(setLoading(false));
    return res.data;
  } catch (error) {
    const message = "Ошибка загрузки отчетов";
    dispatch(setLoading(false));
    dispatch(setError(message));
    return rejectWithValue(message);
  }
});

const reportsSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.list = action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.error = action.payload ?? "Unknown error";
      });
  },
});

export default reportsSlice.reducer;