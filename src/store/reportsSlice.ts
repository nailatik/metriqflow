import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { reportsService, type Report, type CreateReport, type UpdateReport } from "../services/reportsService";
import { setLoading, setError } from "./settingsSlice";

interface ReportsState {
  list: Report[];
  error: string | null;
  loading: boolean;
}

const initialState: ReportsState = {
  list: [],
  error: null,
  loading: false,
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
  } catch {
    const message = "Ошибка загрузки отчетов";
    dispatch(setLoading(false));
    dispatch(setError(message));
    return rejectWithValue(message);
  }
});

export const createReport = createAsyncThunk<
  Report,
  CreateReport,
  { rejectValue: string }
>("reports/createReport", async (data, { dispatch, rejectWithValue }) => {
  dispatch(setLoading(true));
  try {
    const res = await reportsService.createReport(data);
    dispatch(setLoading(false));
    return res.data;
  } catch {
    const message = "Ошибка создания отчета";
    dispatch(setLoading(false));
    dispatch(setError(message));
    return rejectWithValue(message);
  }
});

export const updateReport = createAsyncThunk<
  Report,
  UpdateReport,
  { rejectValue: string }
>("reports/updateReport", async (data, { dispatch, rejectWithValue }) => {
  dispatch(setLoading(true));
  try {
    const res = await reportsService.updateReport(data);
    dispatch(setLoading(false));
    return res.data;
  } catch {
    const message = "Ошибка обновления отчета";
    dispatch(setLoading(false));
    dispatch(setError(message));
    return rejectWithValue(message);
  }
});

export const deleteReport = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>("reports/deleteReport", async (id, { dispatch, rejectWithValue }) => {
  dispatch(setLoading(true));
  try {
    await reportsService.deleteReport(id);
    dispatch(setLoading(false));
    return id;
  } catch {
    const message = "Ошибка удаления отчета";
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
      })
      .addCase(createReport.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(createReport.rejected, (state, action) => {
        state.error = action.payload ?? "Unknown error";
      })
      .addCase(updateReport.fulfilled, (state, action) => {
        const index = state.list.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      .addCase(updateReport.rejected, (state, action) => {
        state.error = action.payload ?? "Unknown error";
      })
      .addCase(deleteReport.fulfilled, (state, action) => {
        state.list = state.list.filter(r => r.id !== action.payload);
      })
      .addCase(deleteReport.rejected, (state, action) => {
        state.error = action.payload ?? "Unknown error";
      });
  },
});

export default reportsSlice.reducer;