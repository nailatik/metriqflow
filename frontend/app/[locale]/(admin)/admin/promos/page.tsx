"use client";

import { useState, useEffect, useCallback } from "react";
import { adminService } from "@/features/admin/api/adminService";
import type { PromoCode, PromoRedemption, CreatePromoPayload, Plan, PromoStatus } from "@/features/admin/types";
import { Table, type TableColumn, Pagination } from "@/shared/ui/Table/Table";
import { Badge } from "@/shared/ui/Badge/Badge";
import { Button } from "@/shared/ui/Button/Button";
import { Modal } from "@/shared/ui/Modal/Modal";
import { Drawer } from "@/shared/ui/Drawer/Drawer";
import { Input } from "@/shared/ui/Input/Input";
import { Select } from "@/shared/ui/Select/Select";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";

/* ---- helpers ---- */
const PLAN_OPTIONS = [
  { value: "free",     label: "Free" },
  { value: "pro",      label: "Pro" },
  { value: "agency",   label: "Agency" },
  { value: "ultimate", label: "Ultimate (hidden)" },
];

const STATUS_BADGE: Record<PromoStatus, { variant: "success" | "muted" | "danger" | "warning"; label: string }> = {
  active:    { variant: "success", label: "Active" },
  exhausted: { variant: "muted",   label: "Exhausted" },
  expired:   { variant: "warning", label: "Expired" },
  disabled:  { variant: "danger",  label: "Disabled" },
};

const PLAN_BADGE: Record<Plan, { variant: "primary" | "success" | "warning" | "muted"; label: string }> = {
  free:     { variant: "muted",   label: "Free" },
  pro:      { variant: "primary", label: "Pro" },
  agency:   { variant: "success", label: "Agency" },
  ultimate: { variant: "warning", label: "Ultimate" },
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtRelative(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  const now = Date.now();
  const diff = dt.getTime() - now;
  if (diff < 0) return "Expired";
  const days = Math.ceil(diff / 86_400_000);
  return `in ${days}d`;
}

/* ---- Page ---- */
const PAGE_SIZE = 20;

export default function PromosPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);

  /* create modal */
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<{
    code: string; label: string; grants_plan: Plan;
    mode: "permanent" | "days"; duration: string;
    max_uses: string; expires_at: string;
  }>({ code: "", label: "", grants_plan: "pro", mode: "permanent", duration: "", max_uses: "100", expires_at: "" });
  const [createErr, setCreateErr] = useState("");

  /* edit state */
  const [editTarget, setEditTarget] = useState<PromoCode | null>(null);
  const [editForm, setEditForm] = useState({ label: "", max_uses: "", expires_at: "", active: true });
  const [editing, setEditing] = useState(false);
  const [editErr, setEditErr] = useState("");

  /* delete confirm */
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* redemptions drawer */
  const [redemptionCode, setRedemptionCode] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<PromoRedemption[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);

  /* ---- Load ---- */
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminService.listPromos();
      setPromos(res.data);
    } catch {
      setError("Failed to load promo codes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /* ---- Redemptions ---- */
  useEffect(() => {
    if (!redemptionCode) return;
    setRedemptionsLoading(true);
    adminService.getRedemptions(redemptionCode)
      .then((r) => setRedemptions(r.data))
      .catch(() => setRedemptions([]))
      .finally(() => setRedemptionsLoading(false));
  }, [redemptionCode]);

  /* ---- Create ---- */
  const handleCreate = async () => {
    setCreateErr("");
    const payload: CreatePromoPayload = {
      grants_plan: createForm.grants_plan,
      max_uses: Number(createForm.max_uses),
    };
    if (createForm.code.trim()) payload.code = createForm.code.trim();
    if (createForm.label.trim()) payload.label = createForm.label.trim();
    if (createForm.mode === "days" && createForm.duration)
      payload.grants_duration_days = Number(createForm.duration);
    if (createForm.expires_at) payload.expires_at = new Date(createForm.expires_at).toISOString();

    setCreating(true);
    try {
      await adminService.createPromo(payload);
      setCreateOpen(false);
      setCreateForm({ code: "", label: "", grants_plan: "pro", mode: "permanent", duration: "", max_uses: "100", expires_at: "" });
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setCreateErr(msg ?? "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  /* ---- Edit ---- */
  const openEdit = (p: PromoCode) => {
    setEditTarget(p);
    setEditErr("");
    setEditForm({
      label: p.label ?? "",
      max_uses: String(p.max_uses),
      expires_at: p.expires_at ? p.expires_at.slice(0, 10) : "",
      active: p.active,
    });
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setEditErr("");
    setEditing(true);
    try {
      await adminService.patchPromo(editTarget.code, {
        label: editForm.label || null,
        max_uses: Number(editForm.max_uses),
        expires_at: editForm.expires_at ? new Date(editForm.expires_at).toISOString() : null,
        active: editForm.active,
      });
      setEditTarget(null);
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setEditErr(msg ?? "Failed to update");
    } finally {
      setEditing(false);
    }
  };

  /* ---- Delete ---- */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminService.deletePromo(deleteTarget.code);
      setDeleteTarget(null);
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      alert(msg ?? "Cannot delete");
    } finally {
      setDeleting(false);
    }
  };

  /* ---- Table columns ---- */
  const columns: TableColumn<PromoCode>[] = [
    {
      key: "code",
      header: "Code",
      render: (r) => (
        <span className="font-mono text-xs text-textMain">{r.code}</span>
      ),
    },
    {
      key: "label",
      header: "Label",
      render: (r) => (
        <span className="text-textSecondary text-xs">{r.label ?? "—"}</span>
      ),
    },
    {
      key: "grants_plan",
      header: "Plan",
      render: (r) => {
        const b = PLAN_BADGE[r.grants_plan];
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    {
      key: "mode",
      header: "Duration",
      render: (r) =>
        r.grants_duration_days ? `${r.grants_duration_days}d` : "Permanent",
    },
    {
      key: "used_count",
      header: "Used / Max",
      render: (r) => (
        <span className="font-mono tabular-nums text-xs">
          {r.used_count} / {r.max_uses}
        </span>
      ),
    },
    {
      key: "expires_at",
      header: "Expires",
      render: (r) => (
        <span className="text-xs text-textSecondary" title={fmtDate(r.expires_at)}>
          {r.expires_at ? fmtRelative(r.expires_at) : "Never"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const s = STATUS_BADGE[r.status];
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: "created_at",
      header: "Created",
      render: (r) => (
        <span className="text-xs text-textSecondary">{fmtDate(r.created_at)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => { setRedemptionCode(r.code); setRedemptions([]); }}
            className="px-2 py-1 rounded-lg text-xs text-textSecondary hover:text-textMain hover:bg-surfaceMuted transition-colors"
            title="View redemptions"
          >
            {r.used_count > 0 ? `${r.used_count} uses` : "0 uses"}
          </button>
          <button
            onClick={() => openEdit(r)}
            className="px-2 py-1 rounded-lg text-xs text-textSecondary hover:text-textMain hover:bg-surfaceMuted transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => setDeleteTarget(r)}
            className="px-2 py-1 rounded-lg text-xs text-error hover:bg-error/10 transition-colors"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const paginated = promos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-textMain mb-0.5">Promo codes</h1>
          <p className="text-sm text-textSecondary">
            {promos.length} total · {promos.filter((p) => p.status === "active").length} active
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ New promo</Button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-error/10 text-error text-sm border border-error/20">
          {error}
        </div>
      )}

      {/* Table */}
      {!loading && promos.length === 0 ? (
        <EmptyState
          title="No promo codes yet"
          description="Create one to give users trial access."
          action={<Button onClick={() => setCreateOpen(true)}>Create promo</Button>}
        />
      ) : (
        <>
          <Table
            columns={columns}
            rows={paginated}
            keyFn={(r) => r.code}
            loading={loading}
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={promos.length} onPage={setPage} />
        </>
      )}

      {/* ---- CREATE MODAL ---- */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New promo code">
        <div className="flex flex-col gap-4">
          <Input
            label="Code (leave blank to auto-generate)"
            placeholder="e.g. SUMMER2026"
            value={createForm.code}
            onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          />
          <Input
            label="Label (internal note)"
            placeholder="e.g. Визитки конференция"
            value={createForm.label}
            onChange={(e) => setCreateForm((f) => ({ ...f, label: e.target.value }))}
          />
          <Select
            label="Grants plan"
            options={PLAN_OPTIONS}
            value={createForm.grants_plan}
            onChange={(e) => setCreateForm((f) => ({ ...f, grants_plan: e.target.value as Plan }))}
          />
          <Select
            label="Duration"
            options={[
              { value: "permanent", label: "Permanent" },
              { value: "days",      label: "Fixed days" },
            ]}
            value={createForm.mode}
            onChange={(e) => setCreateForm((f) => ({ ...f, mode: e.target.value as "permanent" | "days" }))}
          />
          {createForm.mode === "days" && (
            <Input
              label="Days"
              type="number"
              min="1"
              placeholder="30"
              value={createForm.duration}
              onChange={(e) => setCreateForm((f) => ({ ...f, duration: e.target.value }))}
            />
          )}
          <Input
            label="Max activations"
            type="number"
            min="1"
            value={createForm.max_uses}
            onChange={(e) => setCreateForm((f) => ({ ...f, max_uses: e.target.value }))}
          />
          <Input
            label="Expires at (optional)"
            type="date"
            value={createForm.expires_at}
            onChange={(e) => setCreateForm((f) => ({ ...f, expires_at: e.target.value }))}
          />
          {createErr && <p className="text-error text-sm">{createErr}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ---- EDIT MODAL ---- */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit ${editTarget?.code ?? ""}`}>
        {editTarget && (
          <div className="flex flex-col gap-4">
            <Input
              label="Label"
              placeholder="Internal note"
              value={editForm.label}
              onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
            />
            <Input
              label="Max activations"
              type="number"
              min={editTarget.used_count}
              value={editForm.max_uses}
              onChange={(e) => setEditForm((f) => ({ ...f, max_uses: e.target.value }))}
            />
            <Input
              label="Expires at"
              type="date"
              value={editForm.expires_at}
              onChange={(e) => setEditForm((f) => ({ ...f, expires_at: e.target.value }))}
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.active}
                onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked }))}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <span className="text-sm text-textMain">Active</span>
            </label>
            {editErr && <p className="text-error text-sm">{editErr}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button onClick={handleEdit} disabled={editing}>
                {editing ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ---- DELETE CONFIRM ---- */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete promo?">
        {deleteTarget && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-textMain">
              Delete <span className="font-mono font-semibold">{deleteTarget.code}</span>?
              {deleteTarget.used_count > 0 && (
                <span className="text-error"> This code has {deleteTarget.used_count} redemptions and cannot be deleted — disable it instead.</span>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              {deleteTarget.used_count === 0 && (
                <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              )}
              {deleteTarget.used_count > 0 && (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await adminService.patchPromo(deleteTarget.code, { active: false });
                    setDeleteTarget(null);
                    await load();
                  }}
                >
                  Disable instead
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ---- REDEMPTIONS DRAWER ---- */}
      <Drawer
        open={!!redemptionCode}
        onClose={() => setRedemptionCode(null)}
        title={`Redemptions — ${redemptionCode ?? ""}`}
      >
        {redemptionsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded-xl bg-surfaceMuted animate-pulse" />
            ))}
          </div>
        ) : redemptions.length === 0 ? (
          <EmptyState title="No redemptions yet" />
        ) : (
          <div className="space-y-1">
            {redemptions.map((r) => (
              <div key={`${r.user_id}-${r.redeemed_at}`} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <span className="text-sm text-textMain">{r.email}</span>
                <span className="text-xs text-textSecondary font-mono">
                  {new Date(r.redeemed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}
