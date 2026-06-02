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
  me,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  registerSchema,
  loginSchema,
  passwordChangeSchema,
} from "../schemas/auth.schemas";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);

router.get("/verify-email", verifyEmail);
router.post("/resend-verification", authMiddleware, resendVerification);

router.get("/me", authMiddleware, me);

router.patch("/profile", authMiddleware, updateProfile);
router.patch("/password", authMiddleware, validate(passwordChangeSchema), changePassword);
router.post("/delete-request", authMiddleware, requestDeleteAccount);
router.delete("/account", authMiddleware, deleteUser);

export default router;