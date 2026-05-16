import { makeAutoObservable, runInAction } from "mobx";
import { authService } from "../api/authService";
import type { User, RegisterData } from "../types";
import type { RootStore } from "@/shared/store/RootStore";

export class UserStore {
  user: User | null = null;
  token: string | null = null;
  isAuth: boolean = false;

  constructor(private root: RootStore) {
    makeAutoObservable(this);
    this.init();
  }

  private init(): void {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (token) {
      this.token = token;
      this.isAuth = true;
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const res = await authService.login(email, password);
      const { accessToken } = res.data;

      localStorage.setItem("token", accessToken);
      document.cookie = `token=${accessToken}; path=/; max-age=86400`;

      const meRes = await authService.me();

      runInAction(() => {
        this.token = accessToken;
        this.user = meRes.data;
        this.isAuth = true;
      });

      return true;
    } catch {
      return false;
    }
  }

  async register(data: RegisterData): Promise<boolean> {
    try {
      const res = await authService.register(data);
      const { accessToken, user } = res.data;

      localStorage.setItem("token", accessToken);
      document.cookie = `token=${accessToken}; path=/; max-age=86400`;

      runInAction(() => {
        this.token = accessToken;
        this.user = user;
        this.isAuth = true;
      });

      return true;
    } catch {
      return false;
    }
  }

  async fetchMe(): Promise<void> {
    try {
      const res = await authService.me();
      runInAction(() => {
        this.user = res.data;
        this.isAuth = true;
      });
    } catch {
      runInAction(() => {
        this.user = null;
        this.isAuth = false;
        this.token = null;
      });
      localStorage.removeItem("token");
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  }

  async updateOrganization(organization: string): Promise<{ success: boolean; error?: string }> {
    if (!this.user) return { success: false, error: "Not authenticated" };
    try {
      const res = await authService.updateProfile({
        fullName: this.user.full_name ?? "",
        birthDate: this.user.birth_date ?? "",
        organization: organization || null,
        phone: this.user.phone ?? "",
        agreedToProcessing: true,
      });
      runInAction(() => {
        this.user = res.data;
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.message ?? "Error" };
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      await authService.changePassword(currentPassword, newPassword);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.message ?? "Error" };
    }
  }

  async requestDeleteAccount(locale: string): Promise<{ success: boolean; error?: string }> {
    try {
      await authService.requestDeleteAccount(locale);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.response?.data?.message ?? "Error" };
    }
  }

  async deleteAccount(token: string): Promise<boolean> {
    try {
      await authService.deleteAccount(token);
      this.logout();
      return true;
    } catch {
      return false;
    }
  }

  logout(): void {
    this.token = null;
    this.user = null;
    this.isAuth = false;

    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  }
}
