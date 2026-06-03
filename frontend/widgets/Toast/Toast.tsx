"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { observer } from "mobx-react-lite";
import { useUiStore } from "@/shared/store/StoreProvider";
import type { ToastKind } from "@/shared/store/uiStore/models/uiState";

const KIND_STYLES: Record<ToastKind, string> = {
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  error:   "border-error/40 bg-error/10 text-error",
  info:    "border-border bg-surface text-textSecondary",
};

const KIND_ICON: Record<ToastKind, string> = {
  success: "✨",
  error:   "⚠️",
  info:    "ℹ️",
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
        <span className="text-base leading-none">{KIND_ICON[toast.kind]}</span>
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
