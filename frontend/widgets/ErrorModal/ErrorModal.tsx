"use client";

import { observer } from "mobx-react-lite";
import { useUiStore } from "@/shared/store/StoreProvider";

export const ErrorModal = observer(() => {
  const uiStore = useUiStore();

  if (!uiStore.isErrorModalOpen || !uiStore.error) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 text-center">
        <h2 className="text-xl font-semibold text-red-600">Something went wrong</h2>
        <p className="text-textSecondary mt-3">{uiStore.error}</p>
        <button
          onClick={() => uiStore.clearError()}
          className="mt-6 px-5 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
});
