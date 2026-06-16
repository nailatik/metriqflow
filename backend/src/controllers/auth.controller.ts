import { Request, Response } from "express";
import { query, pool } from "../db";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { validateEmail, validatePassword } from "../utils/validation";
import { createAccessToken, createRefreshToken } from "../auth/auth.tokens";
import { setRefreshCookie, clearRefreshCookie } from "../auth/auth.cookies";
import { hashRefreshToken } from "../auth/auth.refreshHash";
import { UserDB, UserRow } from "../types/express";
import jwt from "jsonwebtoken";
import { sendVerificationEmail, sendDeleteConfirmationEmail } from "../services/delivery.service";
import { logger } from "../lib/logger";
import { LEGAL_VERSIONS, ConsentType } from "../config/legal";

type AuthBody = {
  email: string;
  password: string;
  fullName: string;
  birthDate: string;
  organization: string;
  phone: string;
  agreedToProcessing: boolean;
  agreedToTerms: boolean;
  agreedToMarketing: boolean;
  locale?: string;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const generateToken = () => crypto.randomBytes(32).toString("hex");

const BCRYPT_ROUNDS = 12;

const getClientIp = (req: Request) =>
  req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket.remoteAddress || null;

async function recordConsents(
  userId: number,
  consents: { type: ConsentType; version: string; granted: boolean }[],
  ip: string | null,
  userAgent: string | null
) {
  for (const c of consents) {
    await query(
      `INSERT INTO user_consents (user_id, consent_type, doc_version, granted, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, c.type, c.version, c.granted, ip, userAgent]
    );
  }
}

/* ---------------- ME ---------------- */

export const me = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await query(
      "SELECT id, email, full_name, birth_date, organization, phone, email_verified, password_length, plan, plan_expires_at, is_admin, agreed_to_marketing FROM users WHERE id = $1 AND deleted_at IS NULL",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, "ME ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- REGISTER ---------------- */

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, birthDate, organization, phone, agreedToProcessing, agreedToTerms, agreedToMarketing, locale = "ru" } = req.body as AuthBody;

    const normalizedEmail = normalizeEmail(email);

    const emailError = validateEmail(normalizedEmail);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      return res.status(400).json({
        message: "Validation error",
        errors: { email: emailError, password: passwordError },
      });
    }

    if (!fullName) {
      return res.status(400).json({ message: "Full name is required" });
    }

    if (!birthDate) {
      return res.status(400).json({ message: "Date of birth is required" });
    }

    if (!phone) {
      return res.status(400).json({ message: "Phone is required" });
    }

    if (!agreedToProcessing) {
      return res.status(400).json({ message: "Consent to data processing is required" });
    }

    if (!agreedToTerms) {
      return res.status(400).json({ message: "Acceptance of terms is required" });
    }

    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const verificationToken = generateToken();

    const result = await query(
      `INSERT INTO users (email, password, full_name, birth_date, organization, phone, agreed_to_processing,
                          agreed_to_terms, agreed_to_marketing, is_profile_completed,
                          email_verified, email_verification_token, email_verification_expires_at, password_length)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, false, $10, NOW() + interval '24 hours', $11)
       RETURNING id, email, full_name, birth_date, organization, phone, is_profile_completed, email_verified`,
      [normalizedEmail, hashed, fullName, birthDate, organization || null, phone, agreedToProcessing, agreedToTerms, !!agreedToMarketing, verificationToken, password.length]
    );

    const user = result.rows[0] as UserRow | undefined;

    if (!user) {
      return res.status(500).json({ message: "User creation failed" });
    }

    const ip = getClientIp(req);
    const userAgent = req.headers["user-agent"] || null;
    await recordConsents(
      user.id,
      [
        { type: "pdn", version: LEGAL_VERSIONS.consent, granted: true },
        { type: "terms", version: LEGAL_VERSIONS.terms, granted: true },
        ...(agreedToMarketing ? [{ type: "marketing" as ConsentType, version: LEGAL_VERSIONS.consent, granted: true }] : []),
      ],
      ip,
      userAgent
    );

    // revoke old sessions (safety)
    await query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [user.id]
    );

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + interval '7 days')`,
      [user.id, hashRefreshToken(refreshToken)]
    );

    setRefreshCookie(res, refreshToken);

    // Send verification email (non-blocking — don't fail registration if email fails)
    sendVerificationEmail(normalizedEmail, verificationToken, locale).catch((err) =>
      logger.error({ err }, "Failed to send verification email:")
    );

    return res.json({
      user,
      accessToken,
    });
  } catch (err) {
    logger.error({ err }, "REGISTER ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- LOGIN ---------------- */

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const normalizedEmail = normalizeEmail(email);

    const result = await query(
      `SELECT id, email, password, created_at, is_profile_completed, email_verified,
              full_name, birth_date, organization, phone, password_length, plan, plan_expires_at, is_admin
       FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [normalizedEmail]
    );

    const user = result.rows[0] as UserDB | undefined;

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // revoke previous sessions
    await query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [user.id]
    );

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + interval '7 days')`,
      [user.id, hashRefreshToken(refreshToken)]
    );

    setRefreshCookie(res, refreshToken);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        is_profile_completed: user.is_profile_completed,
        email_verified: user.email_verified,
        full_name: user.full_name,
        birth_date: user.birth_date,
        organization: user.organization,
        phone: user.phone,
        password_length: user.password_length,
        plan: user.plan,
        plan_expires_at: user.plan_expires_at,
        is_admin: user.is_admin ?? false,
      },
      accessToken,
    });
  } catch (err) {
    logger.error({ err }, "LOGIN ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- REFRESH (ROTATION + TRANSACTIONAL) ---------------- */

export const refresh = async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;
  if (!token) {
    return res.status(401).json({ message: "No refresh token" });
  }

  let payload: { id: number };
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { id: number };
  } catch (err) {
    logger.warn({ err }, "REFRESH invalid jwt");
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const tokenHash = hashRefreshToken(token);
  const client = await pool.connect();
  try {
    // Atomic rotation: SELECT … FOR UPDATE ensures concurrent /refresh calls
    // serialize on the same token row; the loser sees revoked_at already set
    // and bails out with 401 instead of double-rotating into two live sessions.
    await client.query("BEGIN");

    const tokenCheck = await client.query(
      `SELECT id FROM refresh_tokens
       WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash],
    );
    if (tokenCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(401).json({ message: "Token revoked" });
    }

    const userResult = await client.query(
      `SELECT id, email, created_at, is_profile_completed, email_verified
       FROM users WHERE id = $1`,
      [payload.id],
    );
    const user = userResult.rows[0] as UserRow | undefined;
    if (!user) {
      await client.query("ROLLBACK");
      return res.status(401).json({ message: "User not found" });
    }

    await client.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1",
      [tokenHash],
    );

    const newAccessToken = createAccessToken(user);
    const newRefreshToken = createRefreshToken(user);

    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + interval '7 days')`,
      [user.id, hashRefreshToken(newRefreshToken)],
    );

    await client.query("COMMIT");

    setRefreshCookie(res, newRefreshToken);
    return res.json({ user, accessToken: newAccessToken });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    logger.error({ err }, "REFRESH ERROR:");
    return res.status(401).json({ message: "Invalid refresh token" });
  } finally {
    client.release();
  }
};

/* ---------------- LOGOUT ---------------- */

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      await query(
        "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1",
        [hashRefreshToken(token)]
      );
    }

    clearRefreshCookie(res);

    return res.json({ message: "Logged out" });
  } catch (err) {
    logger.error({ err }, "LOGOUT ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- VERIFY EMAIL ---------------- */

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const rawToken = (req.query.token as string) ?? "";
    const token = rawToken.replace(/[^a-f0-9]/gi, "");

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const result = await query(
      `SELECT id, email_verified, email_verification_expires_at
       FROM users
       WHERE email_verification_token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    const row = result.rows[0] as { id: number; email_verified: boolean; email_verification_expires_at: Date | string | null };

    if (row.email_verified === true) {
      return res.json({ message: "Email verified" });
    }

    if (row.email_verification_expires_at && new Date(row.email_verification_expires_at) <= new Date()) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    await query(
      `UPDATE users
       SET email_verified = true
       WHERE id = $1`,
      [row.id]
    );

    return res.json({ message: "Email verified" });
  } catch (err) {
    logger.error({ err }, "VERIFY EMAIL ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- RESEND VERIFICATION ---------------- */

export const resendVerification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await query(
      "SELECT id, email, email_verified FROM users WHERE id = $1",
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.email_verified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const verificationToken = generateToken();

    await query(
      `UPDATE users
       SET email_verification_token = $1, email_verification_expires_at = NOW() + interval '24 hours'
       WHERE id = $2`,
      [verificationToken, userId]
    );

    const resendLocale = (req.body as { locale?: string }).locale ?? "ru";
    sendVerificationEmail(user.email as string, verificationToken, resendLocale).catch((err) =>
      logger.error({ err }, "Failed to send verification email:")
    );

    return res.json({ message: "Verification email sent" });
  } catch (err) {
    logger.error({ err }, "RESEND VERIFICATION ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- UPDATE PROFILE ---------------- */

type ProfileBody = {
  fullName: string;
  birthDate: string | null;
  organization: string | null;
  phone: string | null;
  agreedToProcessing: boolean;
  agreedToTerms: boolean;
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { fullName, birthDate, organization, phone, agreedToProcessing, agreedToTerms } = req.body as ProfileBody;

    if (!fullName) {
      return res.status(400).json({ message: "Full name is required" });
    }

    if (!birthDate) {
      return res.status(400).json({ message: "Date of birth is required" });
    }

    if (!phone) {
      return res.status(400).json({ message: "Phone is required" });
    }

    if (!agreedToProcessing) {
      return res.status(400).json({ message: "Consent to data processing is required" });
    }

    if (!agreedToTerms) {
      return res.status(400).json({ message: "Acceptance of terms is required" });
    }

    const result = await query(
      `UPDATE users
       SET full_name = $1, birth_date = $2, organization = $3, phone = $4,
           agreed_to_processing = $5, agreed_to_terms = $6, is_profile_completed = true
       WHERE id = $7
       RETURNING id, email, full_name, birth_date, organization, phone, is_profile_completed`,
      [fullName, birthDate, organization, phone, agreedToProcessing, agreedToTerms, userId]
    );

    const user = result.rows[0];

    return res.json(user);
  } catch (err) {
    logger.error({ err }, "UPDATE PROFILE ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- MARKETING CONSENT (38-FZ opt-out) ---------------- */

export const updateMarketingConsent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { enabled } = req.body as { enabled?: unknown };
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ message: "enabled must be boolean" });
    }

    await query("UPDATE users SET agreed_to_marketing = $1 WHERE id = $2", [enabled, userId]);

    await recordConsents(
      userId,
      [{ type: "marketing", version: LEGAL_VERSIONS.consent, granted: enabled }],
      getClientIp(req),
      req.headers["user-agent"] || null
    );

    return res.json({ agreed_to_marketing: enabled });
  } catch (err) {
    logger.error({ err }, "MARKETING CONSENT ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- CHANGE PASSWORD ---------------- */

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both passwords are required" });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const result = await query("SELECT password FROM users WHERE id = $1", [userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password as string);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await query("UPDATE users SET password = $1, password_length = $2 WHERE id = $3", [hashed, newPassword.length, userId]);

    // Invalidate all existing refresh tokens — forces re-auth on other devices.
    await query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [userId]
    );

    return res.json({ message: "Password updated" });
  } catch (err) {
    logger.error({ err }, "CHANGE PASSWORD ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- REQUEST ACCOUNT DELETION ---------------- */

export const requestDeleteAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    if (!userId || !userEmail) return res.status(401).json({ message: "Unauthorized" });

    const token = jwt.sign(
      { id: userId, purpose: "delete-account" },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    const locale = (req.body as { locale?: string }).locale ?? "ru";
    const confirmUrl = `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/${locale}/app/settings?confirmDelete=${token}`;

    await sendDeleteConfirmationEmail(userEmail, confirmUrl);

    return res.json({ message: "Confirmation email sent" });
  } catch (err) {
    logger.error({ err }, "REQUEST DELETE ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- DELETE USER (REQUIRES TOKEN) ---------------- */

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { token } = req.body as { token: string };
    if (!token) return res.status(400).json({ message: "Confirmation token required" });

    let payload: { id: number; purpose: string };
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; purpose: string };
    } catch {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    if (payload.purpose !== "delete-account" || payload.id !== userId) {
      return res.status(403).json({ message: "Token mismatch" });
    }

    await query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
    await query("DELETE FROM users WHERE id = $1", [userId]);

    clearRefreshCookie(res);

    return res.json({ message: "User deleted" });
  } catch (err) {
    logger.error({ err }, "DELETE USER ERROR:");
    return res.status(500).json({ message: "Internal server error" });
  }
};
