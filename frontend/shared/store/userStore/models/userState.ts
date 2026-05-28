import { makeAutoObservable } from "mobx";
import type { User } from "@/entities/user/types";

export class UserState {
  user: User | null = null;
  token: string | null = null;
  isAuth: boolean = false;

  constructor() {
    makeAutoObservable(this);
  }
}
