import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const LOCALES = routing.locales as readonly string[];
const DEFAULT_LOCALE = routing.defaultLocale;

function getLocale(pathname: string): string {
  const segment = pathname.split("/")[1];
  return LOCALES.includes(segment) ? segment : DEFAULT_LOCALE;
}

function stripLocale(pathname: string, locale: string): string {
  if (pathname === `/${locale}`) return "/";
  if (pathname.startsWith(`/${locale}/`)) return pathname.slice(`/${locale}`.length);
  return pathname;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;
  const locale = getLocale(pathname);
  const path = stripLocale(pathname, locale);

  const isProtected = path.startsWith("/app");
  const isAuthPage =
    path === "/login" ||
    path === "/register" ||
    path.startsWith("/login?") ||
    path.startsWith("/register?");

  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  if (isAuthPage && token) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/app`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
