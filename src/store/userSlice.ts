import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authService } from "../services/authService";

interface UserState {
  token: string | null;
  isAuth: boolean;
  user: { id: number; email: string } | null;
}

const initialState: UserState = {
  token: localStorage.getItem("token"),
  isAuth: !!localStorage.getItem("token"),
  user: null,
};
type MeResponse = {
  id: number;
  email: string;
};

export const fetchMe = createAsyncThunk<MeResponse>(
  "user/me",
  async () => {
    const res = await authService.me();
    return res.data;
  }
);

export const loginUser = createAsyncThunk<
  string,
  { email: string; password: string }
>("user/login", async ({ email, password }) => {
  const res = await authService.login(email, password);

  const token = res.data.token;
  localStorage.setItem("token", token);

  return token;
});

export const registerUser = createAsyncThunk(
  "user/register",
  async ({ email, password }: { email: string; password: string }) => {
    await authService.register(email, password);
  }
);

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    logout(state) {
      state.token = null;
      state.isAuth = false;
      state.user = null;
      localStorage.removeItem("token");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.fulfilled, (state, action) => {
        state.token = action.payload;
        state.isAuth = true;
        localStorage.setItem("token", action.payload);
      })
      .addCase(loginUser.rejected, (state) => {
        state.isAuth = false;
        state.token = null;
        localStorage.removeItem("token");
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.isAuth = true;
        state.user = action.payload;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.isAuth = false;
        state.user = null;
        state.token = null;
        localStorage.removeItem("token");
      });
  },
});

export const { logout } = userSlice.actions;
export default userSlice.reducer;