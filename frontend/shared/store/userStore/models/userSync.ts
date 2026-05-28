import type { User } from "@/entities/user/types";
import type { UserStore } from "../userStore";

const TOKEN_KEY = "token";

function persistToken(token: string | null): void {
  if (typeof window === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    // Cookie needed by next.js middleware (proxy.ts) for server-side route gating.
    document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=86400; SameSite=Lax${secure}`;
  } else {
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secure}`;
  }
}

function isJwtExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const data = JSON.parse(json) as { exp?: number };
    if (typeof data.exp !== "number") return false;
    return data.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export const userSync = {
  hydrateFromStorage(store: UserStore): void {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    if (isJwtExpired(token)) {
      persistToken(null);
      return;
    }
    store.token = token;
    store.isAuth = true;
  },

  setToken(store: UserStore, token: string): void {
    persistToken(token);
    store.token = token;
    store.isAuth = true;
  },

  setSession(store: UserStore, token: string, user: User | null): void {
    persistToken(token);
    store.token = token;
    store.user = user;
    store.isAuth = true;
  },

  setUser(store: UserStore, user: User | null): void {
    store.user = user;
  },

  logout(store: UserStore): void {
    store.token = null;
    store.user = null;
    store.isAuth = false;
    persistToken(null);
  },
};
