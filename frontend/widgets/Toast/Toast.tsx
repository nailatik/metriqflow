"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { observer } from "mobx-react-lite";
import { useUiStore } from "@/shared/store/StoreProvider";
import type { ToastKind } from "@/shared/store/uiStore/models/uiState";

const KIND_STYLES: Record<ToastKind, string> = {
  success: "border-success/40 bg-success/10 text-success",
  error:   "border-error/40 bg-error/10 text-error",
  info:    "border-border bg-surface text-textSecondary",
};

const icon = (paths: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">{paths}</svg>
);

const KIND_ICON: Record<ToastKind, ReactNode> = {
  success: icon(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" /></>),
  error:   icon(<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>),
  info:    icon(<><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>),
};

const DISMISS_MS = 4000;

export const Toast = observer(() => {
  const uiStore = useUiStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const toast = uiStore.state.toast;
  const id = toast?.id;

  useEffect(() => {
    if (id === undefined) return;
    const timer = setTimeout(() => uiStore.clearToast(id), DISMISS_MS);
    return () => clearTimeout(timer);
  }, [id, uiStore]);

  if (!mounted || !toast) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[10001] flex flex-col gap-2 pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 shadow-soft backdrop-blur-sm ${KIND_STYLES[toast.kind]}`}
        role="status"
      >
        <span className="leading-none">{KIND_ICON[toast.kind]}</span>
        <p className="text-sm font-medium">{toast.message}</p>
        <button
          onClick={() => uiStore.clearToast(toast.id)}
          className="ml-1 text-sm opacity-60 hover:opacity-100 transition-opacity"
          aria-label="close"
        >
          ✕
        </button>
      </div>
    </div>,
    document.body,
  );
});
