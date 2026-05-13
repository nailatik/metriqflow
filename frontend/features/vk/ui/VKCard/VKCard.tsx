"use client";

import { useEffect, useRef, useState } from "react";
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
  stats_warning?: string | null;
};

type CardState = "loading" | "idle" | "adding";

const LS_KEY = "metriq_vk_add_start";
const TIMEOUT_MS = 15 * 60 * 1000;
const COMMUNITY_LIMIT = 5;

const VK_APP_ID = parseInt(process.env.NEXT_PUBLIC_VK_APP_ID ?? "54590522", 10);
const VK_SCOPE = "stats groups wall offline";
const VK_REDIRECT_URL = "http://localhost";

type VkAuthResponse = {
  code: string;
  type: string;
  state: string;
  device_id: string;
  expires_in: number;
};
type VkTokenResult = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  state: string;
  token_type: string;
  user_id: number;
  scope: string;
};

export function VKCard() {
  const t = useTranslations("Integrations");

  const [state,           setState]           = useState<CardState>("loading");
  const [communities,     setCommunities]      = useState<Community[]>([]);
  const [token,           setToken]            = useState("");
  const [groupInput,      setGroupInput]       = useState("");
  const [busy,            setBusy]             = useState(false);
  const [error,           setError]            = useState<string | null>(null);
  const [timeLeft,        setTimeLeft]         = useState(0);
  const [removeId,        setRemoveId]         = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Initialize VK ID SDK once when entering "adding" state
  useEffect(() => {
    if (state !== "adding") return;
    let cancelled = false;
    (async () => {
      try {
        const VKID = await import("@vkid/sdk");
        VKID.Config.init({
          app: VK_APP_ID,
          redirectUrl: VK_REDIRECT_URL,
          responseMode: VKID.ConfigResponseMode.Callback,
          mode: VKID.ConfigAuthMode.InNewWindow,
          source: VKID.ConfigSource.LOWCODE,
          scope: VK_SCOPE,
        });
      } catch (e) {
        if (!cancelled) setError(t("vkSdkInitError"));
        console.error("VKID init error", e);
      }
    })();
    return () => { cancelled = true; };
  }, [state, t]);

  // Timer for adding state
  useEffect(() => {
    if (state !== "adding") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const tick = () => {
      const start = parseInt(localStorage.getItem(LS_KEY) ?? "0", 10);
      const rem   = Math.max(0, Math.floor((start + TIMEOUT_MS - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem === 0) {
        localStorage.removeItem(LS_KEY);
        setToken("");
        setGroupInput("");
        setError(t("vkTimerExpired"));
        setState("idle");
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state, t]);

  const handleStartAdding = () => {
    localStorage.setItem(LS_KEY, String(Date.now()));
    setToken("");
    setGroupInput("");
    setError(null);
    setState("adding");
  };

  const handleCancel = () => {
    localStorage.removeItem(LS_KEY);
    setToken("");
    setGroupInput("");
    setError(null);
    setState("idle");
  };

  const handleOpenAuth = async () => {
    setError(null);
    try {
      const VKID = await import("@vkid/sdk");
      const response = (await VKID.Auth.login()) as VkAuthResponse | undefined;
      if (!response || !response.code || !response.device_id) {
        setError(t("vkAuthCancelled"));
        return;
      }
      const tokenResult = (await VKID.Auth.exchangeCode(
        response.code,
        response.device_id
      )) as VkTokenResult;
      if (!tokenResult?.access_token) {
        setError(t("vkAddError"));
        return;
      }
      // TEMP DEBUG: confirm scope returned by VK ID
      console.log("[VK ID] token scope:", tokenResult.scope, "user_id:", tokenResult.user_id, "expires_in:", tokenResult.expires_in);
      // Expose for manual API testing in DevTools console.
      (window as unknown as { __vkToken?: string }).__vkToken = tokenResult.access_token;
      console.log("[VK ID] token saved to window.__vkToken — test in console:");
      console.log(`fetch("https://api.vk.com/method/stats.get?group_id=YOUR_GROUP_ID&interval=day&intervals_count=1&access_token="+window.__vkToken+"&v=5.131").then(r=>r.json()).then(console.log)`);
      setToken(tokenResult.access_token);
    } catch (e) {
      console.error("VKID auth error", e);
      const errObj = e as { code?: number; error?: string; error_description?: string };
      // user closed popup
      if (errObj?.code === 102) {
        setError(t("vkAuthCancelled"));
        return;
      }
      setError(errObj?.error_description ?? errObj?.error ?? t("vkAddError"));
    }
  };

  const extractTokenFromInput = (raw: string): string => raw.trim();

  const handleSubmit = async () => {
    const access_token = extractTokenFromInput(token);
    const group_id = groupInput.trim();
    if (!access_token || !group_id) return;

    setBusy(true);
    setError(null);
    try {
      const res = await http.post<Community>("/vk/communities", { access_token, group_id });
      setCommunities((prev) => [res.data, ...prev]);
      localStorage.removeItem(LS_KEY);
      setToken("");
      setGroupInput("");
      setState("idle");
      if (res.data.stats_warning) {
        setError(`${t("vkSavedWithWarning")}: ${res.data.stats_warning}`);
      }
    } catch (e: unknown) {
      const data = (e as { response?: { data?: { message?: string; code?: number } } })?.response?.data;
      const msg  = data?.message ?? "";
      if (msg.includes("limit")) {
        setError(t("vkLimitReached"));
      } else if (data?.code === 27 || data?.code === 28) {
        setError(t("vkErrCommunityToken"));
      } else if (data?.code === 15 || data?.code === 203) {
        setError(t("vkErrNotAdmin"));
      } else if (data?.code === 5) {
        setError(t("vkErrTokenInvalid"));
      } else if (data?.code === 100 || data?.code === 113) {
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

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

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
          {/* Guide */}
          <div className="bg-bg border border-border rounded-xl p-4 flex flex-col gap-2">
            <p className="text-sm font-semibold text-textMain">{t("vkGuideTitle")}</p>
            <ol className="flex flex-col gap-1.5">
              {([t("vkGuideStep1"), t("vkGuideStep2"), t("vkGuideStep3"), t("vkGuideStep4")] as string[]).map((step, i) => (
                <li key={i} className="text-sm text-textSecondary flex gap-2">
                  <span className="text-primary font-semibold flex-shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={handleOpenAuth}
              className="self-start mt-1 text-sm font-medium text-primary hover:underline"
            >
              {t("vkOpenAuthLink")} →
            </button>
          </div>

          {/* Group input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textSecondary">{t("vkGroupLabel")}</label>
            <input
              type="text"
              value={groupInput}
              onChange={(e) => setGroupInput(e.target.value)}
              placeholder={t("vkGroupPlaceholder")}
              className="w-full bg-bg border border-border rounded-xl px-4 py-2.5 text-sm text-textMain placeholder-textSecondary focus:outline-none focus:border-primary"
            />
          </div>

          {/* Token input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textSecondary">{t("vkTokenLabel")}</label>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t("vkTokenPlaceholder")}
              rows={3}
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm font-mono text-textMain placeholder-textSecondary resize-none focus:outline-none focus:border-primary"
            />
          </div>

          {/* Timer + actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-textSecondary">{t("vkExpiresIn")}</span>
              <span className={`font-mono text-sm font-semibold tabular-nums ${timeLeft <= 60 ? "text-error" : "text-primary"}`}>
                {fmtTime(timeLeft)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="text-sm text-textSecondary hover:underline"
              >
                {t("vkCancel")}
              </button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={busy || !token.trim() || !groupInput.trim()}
              >
                {busy ? t("vkSubmitting") : t("vkSubmit")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
