import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

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

    return next();
  } catch (err) {
    const name = err instanceof Error ? err.name : "UnknownError";
    console.error("AUTH_MIDDLEWARE:", name);
    return res.status(401).json({ message: "Unauthorized" });
  }
};