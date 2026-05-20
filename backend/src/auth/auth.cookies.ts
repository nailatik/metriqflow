import { Response } from "express";

const IS_PROD = process.env.NODE_ENV === "production";

// `lax` is the safest default that still allows the refresh cookie to be sent
// on top-level navigations and same-site XHRs. `strict` breaks cross-site deploys
// (frontend on one domain, backend on another) — in that case set
// COOKIE_SAMESITE=none AND deploy over HTTPS so `secure` kicks in.
const SAME_SITE = (process.env.COOKIE_SAMESITE as "lax" | "strict" | "none") ?? "lax";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD || SAME_SITE === "none",
  sameSite: SAME_SITE,
} as const;

export const setRefreshCookie = (res: Response, token: string) => {
  res.cookie("refreshToken", token, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearRefreshCookie = (res: Response) => {
  res.clearCookie("refreshToken", COOKIE_OPTIONS);
};
