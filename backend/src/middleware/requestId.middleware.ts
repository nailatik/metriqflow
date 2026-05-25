import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

declare module "express-serve-static-core" {
  interface Request {
    id: string;
  }
}

// Tags every request with a stable id — propagated from the inbound
// X-Request-Id header if present (so an upstream gateway / browser-side
// trace id can flow through), or generated otherwise. Echoed back to the
// client and available on `req.id` for log correlation.
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.headers["x-request-id"];
  const id =
    (typeof incoming === "string" && incoming.length > 0 && incoming.length <= 128
      ? incoming
      : crypto.randomUUID());
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
};
