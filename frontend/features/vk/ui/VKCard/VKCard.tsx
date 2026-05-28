"use client";

import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/Button/Button";
import { UpgradeBanner } from "@/features/billing/ui/UpgradeBanner/UpgradeBanner";
import { useCommunitiesStore, useBillingStore } from "@/shared/store/StoreProvider";

type CardState = "idle" | "adding";

export const VKCard = observer(function VKCard() {
  const t = useTranslations("Integrations");
  const communitiesStore = useCommunitiesStore();
  const billingStore = useBillingStore();
  const limits = billingStore.limits;

  const [state,      setState]      = useState<CardState>("idle");
  const [groupInput, setGroupInput] = useState("");
  const [busy,       setBusy]       = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [planLimit,  setPlanLimit]  = useState(false);
  const [removeId,   setRemoveId]   = useState<number | null>(null);

  useEffect(() => {
    communitiesStore.fetch();
  }, [communitiesStore]);

  const communities = communitiesStore.state.list;
  const loaded = communitiesStore.state.loaded;

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
    const result = await communitiesStore.add(group_id);
    setBusy(false);

    if (result.ok) {
      setGroupInput("");
      setState("idle");
      return;
    }

    if ("upgrade" in result) {
      setPlanLimit(true);
      setState("idle");
      return;
    }

    const msg = result.message ?? "";
    const code = result.code;
    if (msg.includes("limit")) {
      setError(t("vkLimitReached"));
    } else if (code === 15) {
      setError(t("vkErrPrivate"));
    } else if (code === 100 || code === 113 || msg.includes("not found") || msg.includes("parse")) {
      setError(t("vkErrGroupNotFound"));
    } else if (msg) {
      setError(msg);
    } else {
      setError(t("vkAddError"));
    }
  };

  const handleRemove = async (id: number) => {
    if (removeId !== id) { setRemoveId(id); return; }
    await communitiesStore.remove(id);
    setRemoveId(null);
  };

  const canAdd = limits.vk_communities === null || communities.length < limits.vk_communities;

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

      {/* Error / upgrade */}
      {planLimit && <UpgradeBanner compact reason={t("vkLimitReached")} />}
      {error && !planLimit && <p className="text-xs text-error">{error}</p>}

      {/* Loading */}
      {!loaded && (
        <div className="h-9 w-32 bg-border rounded-lg animate-pulse" />
      )}

      {/* Communities list */}
      {loaded && state === "idle" && communities.length > 0 && (
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
      {loaded && state === "idle" && (
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
});
