import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AuthResponse, User } from "../types/user";

interface UserState {
  user: User | null;
  token: string | null;
  isAuth: boolean;
}

const initialState: UserState = {
  user: null,
  token: null,
  isAuth: false,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<AuthResponse>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuth = true;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuth = false;
    },
  },
});

export const { loginSuccess, logout } = userSlice.actions;
export default userSlice.reducer;