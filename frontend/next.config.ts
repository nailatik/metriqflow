import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

const csp = [
  "default-src 'self'",
  // 'unsafe-eval' is required for Next.js dev (HMR). Drop it in production builds.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.userapi.com https://*.vk.com https://*.vk.me https://*.vkuser.net https://*.vkuserlive.net https://*.telesco.pe https://cdn*.telegram.org",
  "font-src 'self' data:",
  `connect-src 'self' ${apiUrl}${isDev ? " ws: wss:" : ""}${sentryDsn ? " https://*.ingest.sentry.io https://*.ingest.us.sentry.io" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "../../"),
  allowedDevOrigins: ["jackal-refrain-impale.ngrok-free.dev"],
  async rewrites() {
    return [
      {
        source: "/vk/:path*",
        destination: `${apiUrl}/vk/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

const baseConfig = withNextIntl(nextConfig);

export default withSentryConfig(baseConfig, {
  silent: true,
  disableLogger: true,
  // Source map upload requires SENTRY_AUTH_TOKEN — skip in dev/CI without it.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  autoInstrumentServerFunctions: false,
});
