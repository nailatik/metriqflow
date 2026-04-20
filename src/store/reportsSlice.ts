import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { reportsService, type Report } from "../services/reportsService";

interface ReportsState {
  list: Report[];
  error: string | null;
}

const initialState: ReportsState = {
  list: [],
  error: null,
};

export const fetchReports = createAsyncThunk<
  Report[],
  void,
  { rejectValue: string }
>("reports/fetchReports", async (_, { rejectWithValue }) => {
  try {
    const res = await reportsService.getReports();
    return res.data;
  } catch {
    return rejectWithValue("Ошибка загрузки отчетов");
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