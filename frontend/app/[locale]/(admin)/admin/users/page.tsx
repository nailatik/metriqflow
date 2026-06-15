"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/shared/ui/Badge/Badge";
import { Drawer } from "@/shared/ui/Drawer/Drawer";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { adminService } from "@/features/admin/api/adminService";
import type {
  AdminUser,
  AdminUserDetail,
  Plan,
} from "@/features/admin/types";

// ─── helpers ────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<Plan, string> = {
  free:     "Free",
  pro:      "Pro",
  agency:   "Agency",
  ultimate: "Ultimate",
};

const PLAN_VARIANT: Record<Plan, "muted" | "primary" | "warning" | "success"> = {
  free:     "muted",
  pro:      "primary",
  agency:   "warning",
  ultimate: "success",
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function relDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30)  return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ─── user detail drawer ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-mono text-textSecondary uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-border last:border-0 gap-4">
      <span className="text-xs text-textSecondary shrink-0">{label}</span>
      <span className="text-xs text-textMain text-right font-mono">{value}</span>
    </div>
  );
}

interface PlanFormProps {
  userId: number;
  current: Plan;
  currentExpiry: string | null;
  onSaved: () => void;
}

function PlanForm({ userId, current, currentExpiry, onSaved }: PlanFormProps) {
  const [plan, setPlan]     = useState<Plan>(current);
  const [expiry, setExpiry] = useState(currentExpiry ? currentExpiry.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      await adminService.patchUserPlan(userId, {
        plan,
        plan_expires_at: expiry ? new Date(expiry).toISOString() : null,
      });
      onSaved();
    } catch {
      setErr("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surfaceMuted border border-border rounded-xl p-4 space-y-3">
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[10px] text-textSecondary uppercase tracking-widest mb-1 block">Plan</label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as Plan)}
            className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-textMain focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="agency">Agency</option>
            <option value="ultimate">Ultimate</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-textSecondary uppercase tracking-widest mb-1 block">Expires</label>
          <input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-textMain focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>
      {err && <p className="text-xs text-error">{err}</p>}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-2 rounded-lg bg-primary text-onAccent text-sm font-medium hover:bg-primaryHover transition-colors disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save plan"}
      </button>
    </div>
  );
}

interface UserDrawerProps {
  userId: number | null;
  onClose: () => void;
  onPlanSaved: () => void;
}

function UserDrawer({ userId, onClose, onPlanSaved }: UserDrawerProps) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [planKey, setPlanKey] = useState(0);

  useEffect(() => {
    if (!userId) { setDetail(null); return; }
    setLoading(true);
    adminService.getUser(userId)
      .then(r => setDetail(r.data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [userId, planKey]);

  const handlePlanSaved = () => {
    setPlanKey(k => k + 1);
    onPlanSaved();
  };

  return (
    <Drawer
      open={!!userId}
      onClose={onClose}
      title={detail ? (detail.user.email) : "User details"}
      width="w-full sm:w-[540px]"
    >
      {loading && (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
        </div>
      )}
      {!loading && !detail && (
        <p className="text-sm text-textSecondary">Failed to load user.</p>
      )}
      {!loading && detail && (
        <>
          <Section title="Profile">
            <Row label="Email"    value={detail.user.email} />
            <Row label="Name"     value={detail.user.full_name ?? "—"} />
            <Row label="Org"      value={detail.user.organization ?? "—"} />
            <Row label="Verified" value={detail.user.email_verified ? "✓ yes" : "✗ no"} />
            <Row label="Joined"   value={fmtDate(detail.user.created_at)} />
          </Section>

          <Section title="Plan">
            <div className="mb-3">
              <Row label="Current plan" value={
                <Badge variant={PLAN_VARIANT[detail.user.plan]}>{PLAN_LABELS[detail.user.plan]}</Badge>
              } />
              <Row label="Expires" value={fmtDate(detail.user.plan_expires_at)} />
            </div>
            <PlanForm
              key={planKey}
              userId={detail.user.id}
              current={detail.user.plan}
              currentExpiry={detail.user.plan_expires_at}
              onSaved={handlePlanSaved}
            />
          </Section>

          <Section title={`Telegram${detail.telegram.length > 0 ? ` (${detail.telegram.length})` : ""}`}>
            {detail.telegram.length === 0 ? (
              <p className="text-xs text-textSecondary">Not connected</p>
            ) : detail.telegram.map(tg => (
              <div key={tg.telegram_id} className="bg-surfaceMuted rounded-xl p-3 mb-2">
                <p className="text-xs font-mono text-textMain">
                  {tg.username ? `@${tg.username}` : `id:${tg.telegram_id}`}
                  <span className="text-textSecondary ml-2">· linked {relDate(tg.linked_at)}</span>
                </p>
                {tg.channels && tg.channels.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {tg.channels.map(ch => (
                      <p key={ch.id} className="text-xs text-textSecondary pl-2 border-l border-border">
                        {ch.title}{ch.username ? ` (@${ch.username})` : ""}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Section>

          <Section title={`VK${detail.vk.length > 0 ? ` (${detail.vk.length})` : ""}`}>
            {detail.vk.length === 0 ? (
              <p className="text-xs text-textSecondary">Not connected</p>
            ) : detail.vk.map(vk => (
              <div key={vk.id} className="bg-surfaceMuted rounded-xl p-3 mb-2">
                <p className="text-xs text-textSecondary">linked {relDate(vk.linked_at)}</p>
                {vk.communities && vk.communities.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {vk.communities.map(c => (
                      <p key={c.id} className="text-xs text-textSecondary pl-2 border-l border-border">
                        {c.name}{c.screen_name ? ` (vk.com/${c.screen_name})` : ""}
                        {!c.active && <span className="ml-1 text-error"> · inactive</span>}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Section>

          <Section title={`Schedules${detail.schedules.length > 0 ? ` (${detail.schedules.length})` : ""}`}>
            {detail.schedules.length === 0 ? (
              <p className="text-xs text-textSecondary">No schedules</p>
            ) : detail.schedules.map(s => (
              <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-xs text-textMain">{s.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="muted">{s.format.toUpperCase()}</Badge>
                  {s.enabled
                    ? <Badge variant="success">on</Badge>
                    : <Badge variant="muted">off</Badge>
                  }
                </div>
              </div>
            ))}
          </Section>

          <Section title={`Promo redemptions${detail.redemptions.length > 0 ? ` (${detail.redemptions.length})` : ""}`}>
            {detail.redemptions.length === 0 ? (
              <p className="text-xs text-textSecondary">None</p>
            ) : detail.redemptions.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-xs font-mono text-textMain">{r.code}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={PLAN_VARIANT[r.grants_plan]}>{PLAN_LABELS[r.grants_plan]}</Badge>
                  <span className="text-xs text-textSecondary">{relDate(r.redeemed_at)}</span>
                </div>
              </div>
            ))}
          </Section>
        </>
      )}
    </Drawer>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

const PLANS: { value: string; label: string }[] = [
  { value: "",         label: "All plans" },
  { value: "free",     label: "Free" },
  { value: "pro",      label: "Pro" },
  { value: "agency",   label: "Agency" },
  { value: "ultimate", label: "Ultimate" },
];

const LIMIT = 25;

export default function AdminUsersPage() {
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [plan, setPlan]       = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const load = useCallback(async (p: number, s: string, pl: string) => {
    setLoading(true);
    try {
      const res = await adminService.listUsers({ page: p, limit: LIMIT, search: s, plan: pl });
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page, debouncedSearch, plan);
  }, [page, debouncedSearch, plan, load]);

  const onSearch = (v: string) => {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(v);
    }, 300);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-textMain mb-1">Users</h1>
          <p className="text-sm text-textSecondary">
            {total > 0 ? `${total} total` : ""}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="search"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search email or name…"
          className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border text-sm text-textMain placeholder:text-textSecondary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <select
          value={plan}
          onChange={e => { setPlan(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-textMain focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {PLANS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surfaceMuted">
                <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary hidden md:table-cell">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary hidden lg:table-cell">Connections</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary hidden lg:table-cell">Schedules</th>
              </tr>
            </thead>
            <tbody>
              {loading && [...Array(LIMIT)].map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><Skeleton className="h-4 w-8" /></td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12">
                    <EmptyState
                      title="No users found"
                      description={debouncedSearch || plan ? "Try adjusting your filters." : "No users yet."}
                    />
                  </td>
                </tr>
              )}
              {!loading && users.map(u => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedId(u.id)}
                  className="border-b border-border last:border-0 hover:bg-surfaceMuted cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="text-sm text-textMain font-medium truncate max-w-[200px]">{u.email}</p>
                    {u.full_name && (
                      <p className="text-xs text-textSecondary truncate max-w-[200px]">{u.full_name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={PLAN_VARIANT[u.plan]}>{PLAN_LABELS[u.plan]}</Badge>
                    {u.plan_expires_at && (
                      <p className="text-[10px] text-textSecondary mt-0.5 font-mono">
                        exp {fmtDate(u.plan_expires_at)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-textSecondary font-mono">{relDate(u.created_at)}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {parseInt(u.tg_linked) > 0 && (
                        <Badge variant="primary">TG</Badge>
                      )}
                      {parseInt(u.vk_linked) > 0 && (
                        <Badge variant="warning">VK</Badge>
                      )}
                      {parseInt(u.tg_linked) === 0 && parseInt(u.vk_linked) === 0 && (
                        <span className="text-xs text-textSecondary">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs font-mono tabular-nums text-textMain">
                      {parseInt(u.schedules_count) > 0 ? parseInt(u.schedules_count) : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surfaceMuted">
            <span className="text-xs text-textSecondary">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded-lg text-xs font-medium border border-border bg-surface text-textMain hover:bg-surfaceMuted disabled:opacity-40 transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded-lg text-xs font-medium border border-border bg-surface text-textMain hover:bg-surfaceMuted disabled:opacity-40 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <UserDrawer
        userId={selectedId}
        onClose={() => setSelectedId(null)}
        onPlanSaved={() => void load(page, debouncedSearch, plan)}
      />
    </>
  );
}
