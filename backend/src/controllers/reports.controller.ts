import { Request, Response } from "express";
import { query } from "../db";

function parseId(raw: unknown): number | null {
  const n = parseInt(String(raw), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const getReports = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await query(
      "SELECT id, title FROM reports WHERE user_id = $1 ORDER BY id DESC",
      [userId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("GET REPORTS ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createReport = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title) return res.status(400).json({ message: "Title is required" });
    if (title.length > 255) return res.status(400).json({ message: "Title too long (max 255)" });

    const result = await query(
      "INSERT INTO reports (title, user_id) VALUES ($1, $2) RETURNING id, title",
      [title, userId]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("CREATE REPORT ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateReport = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const reportId = parseId(req.params.id);
    if (!reportId) return res.status(400).json({ message: "Invalid report id" });

    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title) return res.status(400).json({ message: "Title is required" });
    if (title.length > 255) return res.status(400).json({ message: "Title too long (max 255)" });

    const result = await query(
      "UPDATE reports SET title = $1 WHERE id = $2 AND user_id = $3 RETURNING id, title",
      [title, reportId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Report not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE REPORT ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const reportId = parseId(req.params.id);
    if (!reportId) return res.status(400).json({ message: "Invalid report id" });

    const result = await query(
      "DELETE FROM reports WHERE id = $1 AND user_id = $2 RETURNING id",
      [reportId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Report not found" });
    }

    return res.json({ message: "Report deleted" });
  } catch (err) {
    console.error("DELETE REPORT ERROR:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
