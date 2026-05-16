import { Request, Response } from "express";
import { query } from "../db";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { validateEmail, validatePassword } from "../utils/validation";
import { createAccessToken, createRefreshToken } from "../auth/auth.tokens";
import { setRefreshCookie } from "../auth/auth.cookies";
import { UserDB, UserRow } from "../types/express";
import jwt from "jsonwebtoken";
import { sendVerificationEmail, sendDeleteConfirmationEmail } from "../services/delivery.service";

type AuthBody = {
  email: string;
  password: string;
  fullName: string;
  birthDate: string;
  organization: string;
  phone: string;
  agreedToProcessing: boolean;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const generateToken = () => crypto.randomBytes(32).toString("hex");

/* ---------------- REGISTER ---------------- */

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, birthDate, organization, phone, agreedToProcessing } = req.body as AuthBody;

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

    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const verificationToken = generateToken();

    const result = await query(
      `INSERT INTO users (email, password, full_name, birth_date, organization, phone, agreed_to_processing, is_profile_completed,
                          email_verified, email_verification_token, email_verification_expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, false, $8, NOW() + interval '24 hours')
       RETURNING id, email, full_name, birth_date, organization, phone, is_profile_completed, email_verified`,
      [normalizedEmail, hashed, fullName, birthDate, organization || null, phone, agreedToProcessing, verificationToken]
    );

    const user = result.rows[0] as UserRow | undefined;

    if (!user) {
      return res.status(500).json({ message: "User creation failed" });
    }

    // revoke old sessions (safety)
    await query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
      [user.id]
    );

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + interval '7 days')`,
      [user.id, refreshToken]
    );

    setRefreshCookie(res, refreshToken);

    // Send verification email (non-blocking — don't fail registration if email fails)
    sendVerificationEmail(normalizedEmail, verificationToken).catch((err) =>
      console.error("Failed to send verification email:", err)
    );

    return res.json({
      user,
      accessToken,
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- LOGIN ---------------- */

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const normalizedEmail = normalizeEmail(email);

    const result = await query(
      `SELECT id, email, password, created_at, is_profile_completed, email_verified
       FROM users WHERE email = $1`,
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
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + interval '7 days')`,
      [user.id, refreshToken]
    );

    setRefreshCookie(res, refreshToken);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        is_profile_completed: user.is_profile_completed,
        email_verified: user.email_verified,
      },
      accessToken,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- REFRESH (ROTATION FIXED) ---------------- */

export const refresh = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET!
    ) as { id: number };

    const tokenCheck = await query(
      "SELECT id, user_id FROM refresh_tokens WHERE token = $1 AND revoked_at IS NULL AND expires_at > NOW()",
      [token]
    );

    if (tokenCheck.rows.length === 0) {
      return res.status(401).json({ message: "Token revoked" });
    }

    const result = await query(
      `SELECT id, email, created_at, is_profile_completed, email_verified
       FROM users WHERE id = $1`,
      [payload.id]
    );

    const user = result.rows[0] as UserRow | undefined;

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 🔥 ROTATION (IMPORTANT)
    await query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1",
      [token]
    );

    const newAccessToken = createAccessToken(user);
    const newRefreshToken = createRefreshToken(user);

    await query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + interval '7 days')`,
      [user.id, newRefreshToken]
    );

    setRefreshCookie(res, newRefreshToken);

    return res.json({
      user,
      accessToken: newAccessToken,
    });
  } catch (err) {
    console.error("REFRESH ERROR:", err);
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

/* ---------------- LOGOUT ---------------- */

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      await query(
        "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1",
        [token]
      );
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res.json({ message: "Logged out" });
  } catch (err) {
    console.error("LOGOUT ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* ---------------- VERIFY EMAIL ---------------- */

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query as { token: string };

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const result = await query(
      `SELECT id FROM users
       WHERE email_verification_token = $1
         AND email_verification_expires_at > NOW()
         AND email_verified = false`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    await query(
      `UPDATE users
       SET email_verified = true, email_verification_token = NULL, email_verification_expires_at = NULL
       WHERE id = $1`,
      [result.rows[0]!.id]
    );

    return res.json({ message: "Email verified" });
  } catch (err) {
    console.error("VERIFY EMAIL ERROR:", err);
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

    sendVerificationEmail(user.email as string, verificationToken).catch((err) =>
      console.error("Failed to send verification email:", err)
    );

    return res.json({ message: "Verification email sent" });
  } catch (err) {
    console.error("RESEND VERIFICATION ERROR:", err);
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
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { fullName, birthDate, organization, phone, agreedToProcessing } = req.body as ProfileBody;

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

    const result = await query(
      `UPDATE users
       SET full_name = $1, birth_date = $2, organization = $3, phone = $4,
           agreed_to_processing = $5, is_profile_completed = true
       WHERE id = $6
       RETURNING id, email, full_name, birth_date, organization, phone, is_profile_completed`,
      [fullName, birthDate, organization, phone, agreedToProcessing, userId]
    );

    const user = result.rows[0];

    return res.json(user);
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
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

    const hashed = await bcrypt.hash(newPassword, 10);
    await query("UPDATE users SET password = $1 WHERE id = $2", [hashed, userId]);

    return res.json({ message: "Password updated" });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
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
    console.error("REQUEST DELETE ERROR:", err);
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

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res.json({ message: "User deleted" });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
