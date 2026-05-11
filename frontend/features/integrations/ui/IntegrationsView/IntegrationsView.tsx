"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { observer } from "mobx-react-lite";
import { http } from "@/shared/lib/axios";
import { Button } from "@/shared/ui/Button/Button";

const BOT_USERNAME  = process.env.NEXT_PUBLIC_BOT_USERNAME ?? "";
const LS_KEY        = "metriq_tg_link";

type TgAccount = { telegram_username: string | null; first_name: string; linked_at: string };
type TokenData  = { token: string; expiresAt: string };
type CardState  = "loading" | "linked" | "has_token" | "idle";

// ─── Telegram card ────────────────────────────────────────────────────────────

function TelegramCard() {
  const t = useTranslations("Integrations");

  const [state,          setState]          = useState<CardState>("loading");
  const [account,        setAccount]        = useState<TgAccount | null>(null);
  const [tokenData,      setTokenData]      = useState<TokenData | null>(null);
  const [timeLeft,       setTimeLeft]       = useState(0);
  const [copied,         setCopied]         = useState(false);
  const [unlinkConfirm,  setUnlinkConfirm]  = useState(false);
  const [busy,           setBusy]           = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch status on mount
  useEffect(() => {
    http.get<{ linked: boolean; account: TgAccount | null }>("/integrations/telegram/status")
      .then((r) => {
        if (r.data.linked) {
          setAccount(r.data.account);
          setState("linked");
        } else {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) {
            const parsed: TokenData = JSON.parse(raw);
            if (new Date(parsed.expiresAt).getTime() > Date.now()) {
              setTokenData(parsed);
              setState("has_token");
            } else {
              localStorage.removeItem(LS_KEY);
              setState("idle");
            }
          } else {
            setState("idle");
          }
        }
      })
      .catch(() => setState("idle"));
  }, []);

  // Countdown timer
  useEffect(() => {
    if (state !== "has_token" || !tokenData) return;

    const tick = () => {
      const rem = Math.max(0, Math.floor((new Date(tokenData.expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(rem);
      if (rem === 0) {
        localStorage.removeItem(LS_KEY);
        setTokenData(null);
        setState("idle");
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state, tokenData]);

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const handleConnect = async () => {
    setBusy(true);
    try {
      const res = await http.post<TokenData>("/integrations/telegram/token");
      localStorage.setItem(LS_KEY, JSON.stringify(res.data));
      setTokenData(res.data);
      setState("has_token");
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async () => {
    if (!unlinkConfirm) { setUnlinkConfirm(true); return; }
    setBusy(true);
    try {
      await http.delete("/integrations/telegram/unlink");
      localStorage.removeItem(LS_KEY);
      setAccount(null);
      setUnlinkConfirm(false);
      setState("idle");
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!tokenData) return;
    await navigator.clipboard.writeText(tokenData.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg text-textMain">Telegram</h3>
          <p className="text-sm text-textSecondary mt-0.5">
            {state === "linked" && account
              ? `@${account.telegram_username ?? account.first_name}`
              : t("telegramDesc")}
          </p>
        </div>
        {state === "linked" && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t("connected")}
          </span>
        )}
      </div>

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
        <div className="flex items-center gap-2">
          {unlinkConfirm ? (
            <>
              <span className="text-sm text-textSecondary">{t("unlinkConfirm")}</span>
              <button
                onClick={handleUnlink}
                disabled={busy}
                className="text-sm text-error font-medium hover:underline disabled:opacity-50"
              >
                {t("unlinkYes")}
              </button>
              <button
                onClick={() => setUnlinkConfirm(false)}
                className="text-sm text-textSecondary hover:underline"
              >
                {t("unlinkNo")}
              </button>
            </>
          ) : (
            <button
              onClick={handleUnlink}
              className="text-sm text-error hover:underline"
            >
              {t("unlink")}
            </button>
          )}
        </div>
      )}

      {state === "has_token" && tokenData && (
        <div className="flex flex-col gap-3">
          {/* Steps */}
          <ol className="text-sm text-textSecondary space-y-1">
            <li><span className="text-primary font-semibold">1.</span> Open the bot below</li>
            <li><span className="text-primary font-semibold">2.</span> Press <strong className="text-textMain">Start</strong> in Telegram</li>
            <li><span className="text-primary font-semibold">3.</span> Your account links automatically</li>
          </ol>

          {/* Token row */}
          <div className="flex items-center gap-2 bg-bg border border-border rounded-xl px-4 py-2.5">
            <span className="font-mono text-xs text-textSecondary truncate flex-1">{tokenData.token}</span>
            <button onClick={handleCopy} className="text-xs text-primary hover:underline flex-shrink-0">
              {copied ? t("copied") : t("copy")}
            </button>
          </div>

          {/* Timer + open bot */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-textSecondary">{t("expiresIn")}</span>
              <span className={`font-mono text-sm font-semibold tabular-nums ${timeLeft <= 60 ? "text-error" : "text-primary"}`}>
                {fmtTime(timeLeft)}
              </span>
            </div>
            {BOT_USERNAME && (
              <a
                href={`https://t.me/${BOT_USERNAME}?start=${tokenData.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm px-4 py-1.5 rounded-lg bg-primary text-white hover:bg-indigo-700 transition font-medium"
              >
                Open @{BOT_USERNAME}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stub card ────────────────────────────────────────────────────────────────

function StubCard({ name }: { name: string }) {
  const t = useTranslations("Integrations");
  return (
    <div className="bg-surface border border-border rounded-xl p-6 flex flex-col justify-between gap-4 opacity-60">
      <div>
        <h3 className="font-semibold text-lg text-textMain">{name}</h3>
        <p className="text-sm text-textSecondary mt-0.5">{t("comingSoon")}</p>
      </div>
      <Button variant="secondary" disabled>{t("connect")}</Button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export const IntegrationsView = observer(() => {
  const t = useTranslations("Integrations");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-textMain">{t("title")}</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <TelegramCard />
        <StubCard name="VK"        />
        <StubCard name="Instagram" />
        <StubCard name="YouTube"   />
        <StubCard name="TikTok"    />
      </div>
    </div>
  );
});
