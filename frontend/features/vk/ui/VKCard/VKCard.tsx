"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { http } from "@/shared/lib/axios";
import { Button } from "@/shared/ui/Button/Button";

type Community = {
  id: number;
  community_id: string;
  name: string;
  screen_name: string;
  photo_url: string | null;
  member_count: number | null;
};

type CardState = "loading" | "linked" | "idle";

export function VKCard() {
  const t            = useTranslations("Integrations");
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [state,         setState]         = useState<CardState>("loading");
  const [communities,   setCommunities]   = useState<Community[]>([]);
  const [busy,          setBusy]          = useState(false);
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const loadStatus = () => {
    http.get<{ linked: boolean }>("/vk/status")
      .then((r) => {
        if (r.data.linked) {
          setState("linked");
          return http.get<Community[]>("/vk/communities");
        }
        setState("idle");
        return null;
      })
      .then((r) => { if (r) setCommunities(r.data); })
      .catch(() => setState("idle"));
  };

  useEffect(() => {
    loadStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle VK OAuth callback result
  useEffect(() => {
    const vkParam = searchParams.get("vk");
    if (!vkParam) return;

    if (vkParam === "connected") {
      setState("loading");
      loadStatus();
    } else if (vkParam === "error") {
      setError(t("vkConnectError"));
    }

    // Clean query param
    const url = new URL(window.location.href);
    url.searchParams.delete("vk");
    router.replace(url.pathname + (url.search !== "?" ? url.search : ""));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleConnect = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await http.get<{ url: string }>("/vk/auth-url");
      window.location.href = res.data.url;
    } catch {
      setError(t("vkConnectError"));
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectConfirm) { setDisconnectConfirm(true); return; }
    setBusy(true);
    try {
      await http.delete("/vk/disconnect");
      setCommunities([]);
      setDisconnectConfirm(false);
      setState("idle");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg text-textMain">VK</h3>
          <p className="text-sm text-textSecondary mt-0.5">
            {state === "linked"
              ? `${communities.length} ${t("vkCommunities")}`
              : t("vkDesc")}
          </p>
        </div>
        {state === "linked" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t("connected")}
          </span>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-xs text-error">{error}</p>}

      {/* Actions */}
      {state === "loading" && (
        <div className="h-9 w-24 bg-border rounded-lg animate-pulse" />
      )}

      {state === "idle" && (
        <Button variant="primary" onClick={handleConnect} disabled={busy}>
          {busy ? "…" : t("connect")}
        </Button>
      )}

      {state === "linked" && (
        <div className="flex flex-col gap-3">
          {/* Communities list */}
          {communities.length > 0 && (
            <div className="flex flex-col gap-2">
              {communities.slice(0, 3).map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  {c.photo_url && (
                    <img src={c.photo_url} alt={c.name} className="w-6 h-6 rounded-full" />
                  )}
                  <span className="text-sm text-textMain truncate">{c.name}</span>
                  {c.member_count != null && (
                    <span className="text-xs text-textSecondary ml-auto flex-shrink-0">
                      {c.member_count.toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
              {communities.length > 3 && (
                <p className="text-xs text-textSecondary">+{communities.length - 3} more</p>
              )}
            </div>
          )}

          {/* Disconnect */}
          <div className="flex items-center gap-2">
            {disconnectConfirm ? (
              <>
                <span className="text-sm text-textSecondary">{t("unlinkConfirm")}</span>
                <button
                  onClick={handleDisconnect}
                  disabled={busy}
                  className="text-sm text-error font-medium hover:underline disabled:opacity-50"
                >
                  {t("unlinkYes")}
                </button>
                <button
                  onClick={() => setDisconnectConfirm(false)}
                  className="text-sm text-textSecondary hover:underline"
                >
                  {t("unlinkNo")}
                </button>
              </>
            ) : (
              <button
                onClick={handleDisconnect}
                className="text-sm text-error hover:underline"
              >
                {t("unlink")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
