"use client";

import { type ReactNode } from "react";

/* ---- Column definition ---- */
export interface TableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
}

/* ---- Sort state ---- */
export interface SortState {
  key: string;
  dir: "asc" | "desc";
}

/* ---- Table ---- */
interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  keyFn: (row: T) => string | number;
  sort?: SortState;
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyText?: string;
  className?: string;
}

function SortIcon({ active, dir }: { active: boolean; dir?: "asc" | "desc" }) {
  return (
    <span className={`ml-1 text-[10px] ${active ? "text-primary" : "text-textSecondary"}`}>
      {active ? (dir === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );
}

export function Table<T>({
  columns,
  rows,
  keyFn,
  sort,
  onSort,
  onRowClick,
  loading,
  emptyText = "No data",
  className = "",
}: TableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-border ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surfaceMuted">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`
                  px-4 py-3 text-left text-xs font-medium text-textSecondary whitespace-nowrap
                  ${col.sortable && onSort ? "cursor-pointer select-none hover:text-textMain transition-colors" : ""}
                  ${col.className ?? ""}
                `}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                {col.header}
                {col.sortable && onSort && (
                  <SortIcon active={sort?.key === col.key} dir={sort?.dir} />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <div className="h-4 rounded bg-surfaceMuted animate-pulse w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-textSecondary text-sm">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={keyFn(row)}
                className={`
                  border-b border-border last:border-0 transition-colors
                  ${onRowClick ? "cursor-pointer hover:bg-surfaceMuted" : ""}
                `}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-textMain ${col.className ?? ""}`}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---- Pagination ---- */
interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPage }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-1 pt-3 text-sm text-textSecondary">
      <span className="font-mono tabular-nums">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surfaceMuted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ←
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surfaceMuted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}
