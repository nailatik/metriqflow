import { runInAction } from "mobx";
import { authService } from "@/entities/user/api/authService";
import type { RegisterData } from "@/entities/user/types";
import type { UserStore } from "../userStore";
import type { ActionResult } from "../types";
import { userSync } from "./userSync";

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
      userSync.setSession(store, res.data.accessToken, res.data.user);
      return true;
    } catch {
      userSync.logout(store);
      return false;
    }
  },

  async register(store: UserStore, data: RegisterData): Promise<boolean> {
    try {
      const res = await authService.register(data);
      userSync.setSession(store, res.data.accessToken, res.data.user);
      return true;
    } catch {
      return false;
    }
  },

  async fetchMe(store: UserStore): Promise<void> {
    if (store.meInflight) return store.meInflight;
    store.meInflight = (async () => {
      try {
        const res = await authService.me();
        runInAction(() => {
          store.state.user = res.data;
          store.state.isAuth = true;
        });
      } catch {
        userSync.logout(store);
      } finally {
        store.meInflight = null;
      }
    })();
    return store.meInflight;
  },

  async updateOrganization(store: UserStore, organization: string): Promise<ActionResult> {
    if (!store.state.user) return { success: false, error: "Not authenticated" };
    try {
      const res = await authService.updateProfile({
        fullName: store.state.user.full_name ?? "",
        birthDate: store.state.user.birth_date ?? "",
        organization: organization || null,
        phone: store.state.user.phone ?? "",
        agreedToProcessing: true,
      });
      runInAction(() => {
        store.state.user = res.data;
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

  async updateAlertsEnabled(store: UserStore, enabled: boolean): Promise<ActionResult> {
    if (!store.state.user) return { success: false, error: "Not authenticated" };
    try {
      await authService.updateAlerts(enabled);
      runInAction(() => {
        if (store.state.user) store.state.user.alerts_enabled = enabled;
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: getErrorMessage(err) };
    }
  },
};
