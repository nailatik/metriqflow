"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/shared/ui/Badge/Badge";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { adminService } from "@/features/admin/api/adminService";
import type { AuditEvent } from "@/features/admin/types";

const LIMIT = 50;

const ACTION_GROUPS = [
  { value: "",            label: "All actions" },
  { value: "promo.",      label: "Promo" },
  { value: "user.",       label: "Users" },
];

function actionVariant(action: string): "primary" | "warning" | "danger" | "muted" {
  if (action.startsWith("promo.create")) return "primary";
  if (action.startsWith("promo.delete")) return "danger";
  if (action.startsWith("promo."))       return "muted";
  if (action.startsWith("user."))        return "warning";
  return "muted";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function AdminAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    adminService.getAuditLog({ page, limit: LIMIT, action })
      .then(r => {
        setEvents(r.data.events);
        setTotal(r.data.total);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [page, action]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-textMain mb-1">Audit log</h1>
          <p className="text-sm text-textSecondary">Read-only record of all admin actions</p>
        </div>
        <select
          value={action}
          onChange={e => { setAction(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-textMain focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {ACTION_GROUPS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {loading && [...Array(8)].map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32 ml-auto" />
            </div>
          </div>
        ))}

        {!loading && events.length === 0 && (
          <EmptyState
            title="No audit events"
            description={action ? "No events match the selected filter." : "Admin actions will appear here."}
          />
        )}

        {!loading && events.map(e => (
          <div
            key={e.id}
            className="bg-surface border border-border rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setExpanded(prev => prev === e.id ? null : e.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surfaceMuted transition-colors"
            >
              <Badge variant={actionVariant(e.action)}>
                {e.action}
              </Badge>

              {e.target_type && (
                <span className="text-xs text-textSecondary">
                  {e.target_type}
                  {e.target_id ? ` #${e.target_id}` : ""}
                </span>
              )}

              <span className="text-xs text-textSecondary ml-auto shrink-0">
                by {e.admin_email}
              </span>
              <span className="text-xs font-mono text-textSecondary shrink-0">
                {fmtDate(e.created_at)}
              </span>
            </button>

            {expanded === e.id && e.meta && Object.keys(e.meta).length > 0 && (
              <div className="px-4 pb-3 border-t border-border">
                <pre className="mt-2 text-[11px] font-mono text-textSecondary bg-surfaceMuted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(e.meta, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-textSecondary">Page {page} of {totalPages} · {total} total</span>
          <div className="flex gap-2">
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
    </>
  );
}
