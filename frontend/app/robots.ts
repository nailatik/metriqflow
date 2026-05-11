import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register"],
        disallow: ["/app/", "/app/*"],
      },
    ],
    sitemap: "http://localhost:3000/sitemap.xml",
  };
}
