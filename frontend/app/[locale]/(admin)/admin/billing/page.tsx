"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/shared/ui/Badge/Badge";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { adminService } from "@/features/admin/api/adminService";
import type { BillingEvent } from "@/features/admin/types";

const LIMIT = 50;

const EVENT_VARIANT = {
  promo:       "primary",
  plan_change: "warning",
  payment:     "success",
} as const;

const EVENT_LABEL = {
  promo:       "Promo",
  plan_change: "Plan change",
  payment:     "Payment",
} as const;

const PLAN_LABELS: Record<string, string> = {
  free: "Free", pro: "Pro", agency: "Agency", ultimate: "Ultimate",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminBillingPage() {
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminService.getBillingEvents({ page, limit: LIMIT })
      .then(r => {
        setEvents(r.data.events);
        setTotal(r.data.total);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-textMain mb-1">Billing</h1>
        <p className="text-sm text-textSecondary">
          Promo activations, plan changes, payments — unified timeline
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surfaceMuted">
                <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary hidden md:table-cell">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary hidden md:table-cell">Detail</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-textSecondary">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading && [...Array(10)].map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                  ))}
                </tr>
              ))}
              {!loading && events.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12">
                    <EmptyState title="No billing events" description="Promo activations and payments will appear here." />
                  </td>
                </tr>
              )}
              {!loading && events.map((e, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-surfaceMuted transition-colors">
                  <td className="px-4 py-3">
                    <Badge variant={EVENT_VARIANT[e.event_type]}>
                      {EVENT_LABEL[e.event_type]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-textMain font-mono truncate block max-w-[160px]">{e.user_email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-textMain">{e.plan ? (PLAN_LABELS[e.plan] ?? e.plan) : "—"}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs font-mono text-textSecondary">{e.reference ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-textSecondary">{e.detail ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-textMain tabular-nums">
                      {e.amount ? `₽${parseFloat(e.amount).toLocaleString("ru-RU")}` : "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-textSecondary font-mono whitespace-nowrap">{fmtDate(e.created_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surfaceMuted">
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
      </div>
    </>
  );
}
