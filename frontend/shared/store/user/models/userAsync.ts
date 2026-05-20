import { runInAction } from "mobx";
import { authService } from "@/entities/user/api/authService";
import type { RegisterData } from "@/entities/user/types";
import type { UserStore } from "../index";
import { userSync } from "./userSync";

interface ActionResult {
  success: boolean;
  error?: string;
}

function getErrorMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const resp = (err as { response?: { data?: { message?: string } } }).response;
    return resp?.data?.message ?? "Error";
  }
  return "Error";
}

export const userAsync = {
  async login(store: UserStore, email: string, password: string): Promise<boolean> {
    try {
      const res = await authService.login(email, password);
      // Persist token first so the subsequent /auth/me request carries Authorization
      runInAction(() => userSync.setToken(store, res.data.accessToken));
      const meRes = await authService.me();
      runInAction(() => userSync.setUser(store, meRes.data));
      return true;
    } catch {
      runInAction(() => userSync.logout(store));
      return false;
    }
  },

  async register(store: UserStore, data: RegisterData): Promise<boolean> {
    try {
      const res = await authService.register(data);
      runInAction(() => {
        userSync.setSession(store, res.data.accessToken, res.data.user);
      });
      return true;
    } catch {
      return false;
    }
  },

  async fetchMe(store: UserStore): Promise<void> {
    try {
      const res = await authService.me();
      runInAction(() => {
        store.user = res.data;
        store.isAuth = true;
      });
    } catch {
      runInAction(() => userSync.logout(store));
    }
  },

  async updateOrganization(store: UserStore, organization: string): Promise<ActionResult> {
    if (!store.user) return { success: false, error: "Not authenticated" };
    try {
      const res = await authService.updateProfile({
        fullName: store.user.full_name ?? "",
        birthDate: store.user.birth_date ?? "",
        organization: organization || null,
        phone: store.user.phone ?? "",
        agreedToProcessing: true,
      });
      runInAction(() => {
        store.user = res.data;
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  async changePassword(_store: UserStore, currentPassword: string, newPassword: string): Promise<ActionResult> {
    try {
      await authService.changePassword(currentPassword, newPassword);
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  async requestDeleteAccount(_store: UserStore, locale: string): Promise<ActionResult> {
    try {
      await authService.requestDeleteAccount(locale);
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  },

  async deleteAccount(store: UserStore, token: string): Promise<boolean> {
    try {
      await authService.deleteAccount(token);
      userSync.logout(store);
      return true;
    } catch {
      return false;
    }
  },
};
