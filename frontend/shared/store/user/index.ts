import { makeAutoObservable } from "mobx";
import type { User, RegisterData } from "@/entities/user/types";
import type { RootStore } from "../RootStore";
import { initialUserState } from "./models/userState";
import { userSync } from "./models/userSync";
import { userAsync } from "./models/userAsync";

export class UserStore {
  user: User | null = initialUserState.user;
  token: string | null = initialUserState.token;
  isAuth: boolean = initialUserState.isAuth;

  constructor(public root: RootStore) {
    makeAutoObservable(this, { root: false });
    userSync.hydrateFromStorage(this);
  }

  login(email: string, password: string) {
    return userAsync.login(this, email, password);
  }
  register(data: RegisterData) {
    return userAsync.register(this, data);
  }
  fetchMe() {
    return userAsync.fetchMe(this);
  }
  updateOrganization(organization: string) {
    return userAsync.updateOrganization(this, organization);
  }
  changePassword(currentPassword: string, newPassword: string) {
    return userAsync.changePassword(this, currentPassword, newPassword);
  }
  requestDeleteAccount(locale: string) {
    return userAsync.requestDeleteAccount(this, locale);
  }
  deleteAccount(token: string) {
    return userAsync.deleteAccount(this, token);
  }
  logout(): void {
    userSync.logout(this);
    this.root.reset();
  }
  setToken(token: string): void {
    userSync.setToken(this, token);
  }
}
