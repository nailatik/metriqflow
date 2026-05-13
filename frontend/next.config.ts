import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "../../"),
  allowedDevOrigins: ["jackal-refrain-impale.ngrok-free.dev"],
  async rewrites() {
    return [
      {
        source: "/vk/:path*",
        destination: "http://localhost:8000/vk/:path*",
      },
    ];
  },
};

export default withNextIntl(nextConfig);
