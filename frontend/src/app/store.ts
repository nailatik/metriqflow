import { configureStore } from "@reduxjs/toolkit";
import userReducer from "../store/userSlice";
import settingsReducer from "../store/settingsSlice";
import reportsReducer from "../store/reportsSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
    settings: settingsReducer,
    reports: reportsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;