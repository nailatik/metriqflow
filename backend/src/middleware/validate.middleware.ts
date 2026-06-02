import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

// Validates req.body against a zod schema before the controller runs.
// On success, req.body is replaced with the parsed output (unknown keys
// stripped) so controllers receive a clean, typed body. On failure,
// responds 400 with a flat list of issues.
export const validate =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Validation error",
        issues: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }

    req.body = result.data;
    next();
  };
