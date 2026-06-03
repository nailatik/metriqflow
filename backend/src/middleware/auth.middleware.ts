import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { logger } from "../lib/logger";
import { query } from "../db";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No access token" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload & { id: number };

    req.user = decoded;

    // Throttled fire-and-forget: at most 1 write/user/hour — no request impact
    query(
      `UPDATE users SET last_active_at = NOW()
       WHERE id = $1 AND (last_active_at IS NULL OR last_active_at < NOW() - INTERVAL '1 hour')`,
      [decoded.id]
    ).catch(() => {});

    return next();
  } catch (err) {
    const name = err instanceof Error ? err.name : "UnknownError";
    logger.warn({ errName: name }, "AUTH_MIDDLEWARE rejected");
    return res.status(401).json({ message: "Unauthorized" });
  }
};