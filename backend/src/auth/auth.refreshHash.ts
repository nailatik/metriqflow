import crypto from "crypto";

// We never store the raw refresh token in DB. If the database is leaked an
// attacker still cannot mint sessions because the JWT signature requires
// JWT_REFRESH_SECRET, but storing only the hash gives defence-in-depth and
// blocks token replay if the secret is also compromised.
export const hashRefreshToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");
