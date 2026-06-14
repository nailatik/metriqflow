import { Request, Response, NextFunction } from "express";
import { query } from "../db";
import { logger } from "../lib/logger";

export const adminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const id = req.user?.id;
  if (!id) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const result = await query(
      "SELECT is_admin FROM users WHERE id = $1",
      [id]
    );
    if (!result.rows[0]?.is_admin) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
    next();
  } catch (err) {
    logger.error({ err }, "adminMiddleware error");
    res.status(500).json({ message: "Internal server error" });
  }
};
