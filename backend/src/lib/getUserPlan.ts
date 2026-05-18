import { query } from "../db";
import type { Plan } from "../config/plans";

export async function getUserPlan(userId: number): Promise<Plan> {
  try {
    const result = await query(
      "SELECT plan, plan_expires_at FROM users WHERE id = $1",
      [userId]
    );
    const row = result.rows[0] as { plan: string; plan_expires_at: Date | null } | undefined;
    if (!row) return "free";

    const validPlans = new Set<string>(["free", "pro", "agency", "unlimited"]);
    const plan = validPlans.has(row.plan) ? row.plan : "free";

    if (plan !== "free" && plan !== "unlimited" && row.plan_expires_at) {
      const expiresMs = new Date(row.plan_expires_at).getTime();
      if (expiresMs < Date.now()) return "free";
    }

    return plan as Plan;
  } catch {
    return "free";
  }
}
