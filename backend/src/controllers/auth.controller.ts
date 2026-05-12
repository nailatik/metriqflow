import { Request, Response } from "express";
import { query } from "../db";
import bcrypt from "bcrypt";
import { validateEmail, validatePassword } from "../utils/validation";
import { createAccessToken, createRefreshToken } from "../auth/auth.tokens";
import { setRefreshCookie } from "../auth/auth.cookies";
import { UserDB, UserRow } from "../types/express";
import jwt from "jsonwebtoken";

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

    const result = await query(
      `INSERT INTO users (email, password, full_name, birth_date, organization, phone, agreed_to_processing, is_profile_completed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id, email, full_name, birth_date, organization, phone, is_profile_completed`,
      [normalizedEmail, hashed, fullName, birthDate, organization || null, phone, agreedToProcessing]
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
      `SELECT id, email, password, created_at, is_profile_completed
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
      `SELECT id, email, created_at, is_profile_completed
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

/* ---------------- DELETE USER (CLEANUP) ---------------- */

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
    await query("DELETE FROM users WHERE id = $1", [userId]);

    return res.json({ message: "User deleted" });
  } catch (err) {
    console.error("DELETE USER ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};