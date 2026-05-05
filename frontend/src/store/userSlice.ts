import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authService, type User, type RegisterData } from "../services/authService";

interface UserState {
  token: string | null;
  isAuth: boolean;
  user: User | null;
}

const initialState: UserState = {
  token: localStorage.getItem("token"),
  isAuth: !!localStorage.getItem("token"),
  user: null,
};

type AuthResponse = {
  user: User;
  accessToken: string;
};

export const loginUser = createAsyncThunk<
  AuthResponse,
  { email: string; password: string }
>("user/login", async ({ email, password }) => {
  const res = await authService.login(email, password);

  const { accessToken } = res.data;

  localStorage.setItem("token", accessToken);

  const meRes = await authService.me();

  return { accessToken, user: meRes.data };
});

export const registerUser = createAsyncThunk<
  AuthResponse,
  RegisterData
>("user/register", async (data) => {
  const res = await authService.register(data);

  const { accessToken, user } = res.data;

  localStorage.setItem("token", accessToken);

  return { accessToken, user };
});

export const fetchMe = createAsyncThunk<User>(
  "user/me",
  async () => {
    const res = await authService.me();
    return res.data;
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
        state.token = action.payload.accessToken;
        state.user = action.payload.user;
        state.isAuth = true;
      })
      .addCase(loginUser.rejected, (state) => {
        state.isAuth = false;
        state.token = null;
        state.user = null;
        localStorage.removeItem("token");
      })

      .addCase(registerUser.fulfilled, (state, action) => {
        state.token = action.payload.accessToken;
        state.user = action.payload.user;
        state.isAuth = true;
      })

      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuth = true;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.isAuth = false;
        state.token = null;
        localStorage.removeItem("token");
      });
  },
});

export const { logout } = userSlice.actions;
export default userSlice.reducer;