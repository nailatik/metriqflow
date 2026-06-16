import type { User, RegisterData } from "@/entities/user/types";
import type { RootStore } from "../RootStore";
import { UserState } from "./models/userState";
import { userSync } from "./models/userSync";
import { userAsync } from "./models/userAsync";

export class UserStore {
  state: UserState;
  meInflight: Promise<void> | null = null;

  readonly sync = {
    hydrateFromStorage: () => userSync.hydrateFromStorage(this),
    setToken: (token: string) => userSync.setToken(this, token),
    setSession: (token: string, user: User | null) => userSync.setSession(this, token, user),
    setUser: (user: User | null) => userSync.setUser(this, user),
  };

  readonly async = {
    login: (email: string, password: string) => userAsync.login(this, email, password),
    register: (data: RegisterData) => userAsync.register(this, data),
    fetchMe: () => userAsync.fetchMe(this),
    updateOrganization: (organization: string) => userAsync.updateOrganization(this, organization),
    changePassword: (currentPassword: string, newPassword: string) =>
      userAsync.changePassword(this, currentPassword, newPassword),
    requestDeleteAccount: (locale: string) => userAsync.requestDeleteAccount(this, locale),
    deleteAccount: (token: string) => userAsync.deleteAccount(this, token),
    updateAlertsEnabled: (enabled: boolean) => userAsync.updateAlertsEnabled(this, enabled),
    updateMarketingConsent: (enabled: boolean) => userAsync.updateMarketingConsent(this, enabled),
  };

  constructor(public root: RootStore) {
    this.state = new UserState();
    this.sync.hydrateFromStorage();
  }

  login(email: string, password: string) {
    return this.async.login(email, password);
  }
  register(data: RegisterData) {
    return this.async.register(data);
  }
  fetchMe() {
    return this.async.fetchMe();
  }
  updateOrganization(organization: string) {
    return this.async.updateOrganization(organization);
  }
  changePassword(currentPassword: string, newPassword: string) {
    return this.async.changePassword(currentPassword, newPassword);
  }
  requestDeleteAccount(locale: string) {
    return this.async.requestDeleteAccount(locale);
  }
  deleteAccount(token: string) {
    return this.async.deleteAccount(token);
  }
  updateAlertsEnabled(enabled: boolean) {
    return this.async.updateAlertsEnabled(enabled);
  }
  updateMarketingConsent(enabled: boolean) {
    return this.async.updateMarketingConsent(enabled);
  }
  logout(): void {
    userSync.logout(this);
    this.root.reset();
  }
  setToken(token: string): void {
    this.sync.setToken(token);
  }
}
