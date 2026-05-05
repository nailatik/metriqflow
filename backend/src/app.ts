import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import reportsRoutes from "./routes/reports.routes";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:4173"],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use("/auth", authRoutes);
app.use("/reports", reportsRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

export default app;