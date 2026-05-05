import jwt from "jsonwebtoken";
import { UserRow } from "../types/express";

export const createAccessToken = (user: UserRow) => {
  return jwt.sign(
    { id: user.id, email: user.email, full_name: user.full_name },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" }
  );
};

export const createRefreshToken = (user: UserRow) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "7d" }
  );
};