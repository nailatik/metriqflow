import { Router } from "express";
import {
  login,
  register,
  refresh,
  logout,
  updateProfile,
  deleteUser,
  verifyEmail,
  resendVerification,
  changePassword,
  requestDeleteAccount,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { query } from "../db";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.get("/verify-email", verifyEmail);
router.post("/resend-verification", authMiddleware, resendVerification);

router.get("/me", authMiddleware, async (req: any, res: any) => {
  const userId = req.user.id;
  const result = await query(
    "SELECT id, email, full_name, birth_date, organization, phone, email_verified, password_length, plan, plan_expires_at FROM users WHERE id = $1",
    [userId]
  );
  res.json(result.rows[0] || req.user);
});

router.patch("/profile", authMiddleware, updateProfile);
router.patch("/password", authMiddleware, changePassword);
router.post("/delete-request", authMiddleware, requestDeleteAccount);
router.delete("/account", authMiddleware, deleteUser);

export default router;