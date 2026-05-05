import { Response } from "express";
import { query } from "../db";
import { AuthRequest } from "../types/express"

export const getReports = async (req: any, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const result = await query(
    "SELECT id, title FROM reports WHERE user_id = $1",
    [userId]
  );

  res.json(result.rows);
};

interface CreateReportBody {
  title: string;
}

export const createReport = async (
  req: any & { body: CreateReportBody },
  res: Response
) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { title } = req.body;

  const result = await query(
    "INSERT INTO reports (title, user_id) VALUES ($1, $2) RETURNING *",
    [title, userId]
  );

  res.json(result.rows[0]);
};

export const updateReport = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const reportId = req.params.id;
  const { title } = req.body;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const result = await query(
    "UPDATE reports SET title = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
    [title, reportId, userId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "Report not found" });
  }

  res.json(result.rows[0]);
};

export const deleteReport = async (req: any, res: Response) => {
  const userId = req.user?.id;
  const reportId = req.params.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  await query(
    "DELETE FROM reports WHERE id = $1 AND user_id = $2",
    [reportId, userId]
  );

  res.json({ message: "Report deleted" });
};