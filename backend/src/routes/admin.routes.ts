import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";
import { getOverview } from "../controllers/admin/overview.controller";
import {
  listPromos,
  createPromo,
  patchPromo,
  deletePromo,
  getRedemptions,
} from "../controllers/admin/promos.controller";
import {
  listUsers,
  getUser,
  patchUserPlan,
} from "../controllers/admin/users.controller";

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get("/overview", getOverview);

router.get("/promos",                   listPromos);
router.post("/promos",                  createPromo);
router.patch("/promos/:code",           patchPromo);
router.delete("/promos/:code",          deletePromo);
router.get("/promos/:code/redemptions", getRedemptions);

router.get("/users",              listUsers);
router.get("/users/:id",          getUser);
router.patch("/users/:id/plan",   patchUserPlan);

export default router;
