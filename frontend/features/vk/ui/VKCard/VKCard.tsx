"use client";

import { useEffect, useState } from "react";
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

type CardState = "loading" | "idle" | "adding";

const COMMUNITY_LIMIT = 5;

export function VKCard() {
  const t = useTranslations("Integrations");

  const [state,       setState]       = useState<CardState>("loading");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [groupInput,  setGroupInput]  = useState("");
  const [busy,        setBusy]        = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [removeId,    setRemoveId]    = useState<number | null>(null);

  const loadCommunities = () => {
    http.get<Community[]>("/vk/communities")
      .then((r) => {
        setCommunities(r.data);
        setState("idle");
      })
      .catch(() => setState("idle"));
  };

  useEffect(() => {
    loadCommunities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartAdding = () => {
    setGroupInput("");
    setError(null);
    setState("adding");
  };

  const handleCancel = () => {
    setGroupInput("");
    setError(null);
    setState("idle");
  };

  const handleSubmit = async () => {
    const group_id = groupInput.trim();
    if (!group_id) return;

    setBusy(true);
    setError(null);
    try {
      const res = await http.post<Community>("/vk/communities", { group_id });
      setCommunities((prev) => [res.data, ...prev]);
      setGroupInput("");
      setState("idle");
    } catch (e: unknown) {
      const data = (e as { response?: { data?: { message?: string; code?: number } } })?.response?.data;
      const msg  = data?.message ?? "";
      if (msg.includes("limit")) {
        setError(t("vkLimitReached"));
      } else if (data?.code === 15) {
        setError(t("vkErrPrivate"));
      } else if (data?.code === 100 || data?.code === 113 || msg.includes("not found") || msg.includes("parse")) {
        setError(t("vkErrGroupNotFound"));
      } else if (msg) {
        setError(msg);
      } else {
        setError(t("vkAddError"));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: number) => {
    if (removeId !== id) { setRemoveId(id); return; }
    try {
      await http.delete(`/vk/communities/${id}`);
      setCommunities((prev) => prev.filter((c) => c.id !== id));
      setRemoveId(null);
    } catch {
      setRemoveId(null);
    }
  };

  const canAdd = communities.length < COMMUNITY_LIMIT;

  return (
    <div className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg text-textMain">VK</h3>
          <p className="text-sm text-textSecondary mt-0.5">
            {communities.length > 0
              ? `${communities.length} ${t("vkCommunities")}`
              : t("vkDesc")}
          </p>
        </div>
        {communities.length > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t("connected")}
          </span>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-xs text-error">{error}</p>}

      {/* Loading */}
      {state === "loading" && (
        <div className="h-9 w-32 bg-border rounded-lg animate-pulse" />
      )}

      {/* Communities list */}
      {state === "idle" && communities.length > 0 && (
        <div className="flex flex-col gap-2">
          {communities.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              {c.photo_url && (
                <img src={c.photo_url} alt={c.name} className="w-6 h-6 rounded-full flex-shrink-0" />
              )}
              <span className="text-sm text-textMain truncate flex-1">{c.name}</span>
              {c.member_count != null && (
                <span className="text-xs text-textSecondary flex-shrink-0">
                  {c.member_count.toLocaleString()}
                </span>
              )}
              <div className="flex items-center gap-1 flex-shrink-0">
                {removeId === c.id ? (
                  <>
                    <button
                      onClick={() => handleRemove(c.id)}
                      className="text-xs text-error font-medium hover:underline"
                    >
                      {t("unlinkYes")}
                    </button>
                    <button
                      onClick={() => setRemoveId(null)}
                      className="text-xs text-textSecondary hover:underline"
                    >
                      {t("unlinkNo")}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleRemove(c.id)}
                    className="text-xs text-error hover:underline"
                  >
                    {t("vkRemove")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add button (idle state) */}
      {state === "idle" && (
        canAdd ? (
          <Button variant="primary" onClick={handleStartAdding}>
            {t("vkAddCommunity")}
          </Button>
        ) : (
          <p className="text-xs text-textSecondary">{t("vkLimitReached")}</p>
        )
      )}

      {/* Adding form */}
      {state === "adding" && (
        <div className="flex flex-col gap-4">
          <div className="bg-bg border border-border rounded-xl p-4 flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-textMain">{t("vkGuideTitle")}</p>
            <p className="text-sm text-textSecondary">{t("vkGuideStep1")}</p>
            <p className="text-xs text-textSecondary mt-1">{t("vkPublicNote")}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textSecondary">{t("vkGroupLabel")}</label>
            <input
              type="text"
              value={groupInput}
              onChange={(e) => setGroupInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !busy && groupInput.trim()) handleSubmit(); }}
              placeholder={t("vkGroupPlaceholder")}
              autoFocus
              className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-textMain placeholder-textSecondary focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleCancel}
              className="text-sm text-textSecondary hover:underline"
            >
              {t("vkCancel")}
            </button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={busy || !groupInput.trim()}
            >
              {busy ? t("vkSubmitting") : t("vkSubmit")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
