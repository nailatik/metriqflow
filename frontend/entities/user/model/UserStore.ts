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
