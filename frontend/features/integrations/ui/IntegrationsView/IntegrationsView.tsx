"use client";

import { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/Button/Button";
import { VKCard } from "@/features/vk/ui/VKCard/VKCard";
import { useIntegrationsStore } from "@/shared/store/StoreProvider";
import type { TgTokenData } from "@/entities/integration/types";

const BOT_USERNAME  = process.env.NEXT_PUBLIC_BOT_USERNAME ?? "";
const LS_KEY        = "metriq_tg_link";

type CardState  = "loading" | "linked" | "has_token" | "idle";

// ─── Telegram card ────────────────────────────────────────────────────────────

const TelegramCard = observer(function TelegramCard() {
  const t = useTranslations("Integrations");
  const integrationsStore = useIntegrationsStore();

  const [state,          setState]          = useState<CardState>("loading");
  const [tokenData,      setTokenData]      = useState<TgTokenData | null>(null);
  const [timeLeft,       setTimeLeft]       = useState(0);
  const [copied,         setCopied]         = useState(false);
  const [unlinkConfirm,  setUnlinkConfirm]  = useState(false);
  const [busy,           setBusy]           = useState(false);
  const [cardError,      setCardError]      = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    integrationsStore.fetchStatus();
  }, [integrationsStore]);

  useEffect(() => {
    if (!integrationsStore.state.statusLoaded) return;

    if (integrationsStore.state.tgLinked) {
      setState("linked");
      return;
    }

    const raw = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (raw) {
      try {
        const parsed: TgTokenData = JSON.parse(raw);
        if (new Date(parsed.expiresAt).getTime() > Date.now()) {
          setTokenData(parsed);
          setState("has_token");
          return;
        }
        localStorage.removeItem(LS_KEY);
      } catch {
        localStorage.removeItem(LS_KEY);
      }
    }
    setState("idle");
  }, [integrationsStore.state.statusLoaded, integrationsStore.state.tgLinked]);

  const account = integrationsStore.state.tgAccount;

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
    setCardError(null);
    const data = await integrationsStore.createToken();
    setBusy(false);
    if (!data) {
      setCardError(t("connectError"));
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    }
    setTokenData(data);
    setState("has_token");
  };

  const handleUnlink = async () => {
    if (!unlinkConfirm) { setUnlinkConfirm(true); return; }
    setBusy(true);
    setCardError(null);
    const ok = await integrationsStore.unlink();
    setBusy(false);
    setUnlinkConfirm(false);
    if (!ok) {
      setCardError(t("unlinkError"));
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(LS_KEY);
    }
    setState("idle");
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

      {cardError && <p className="text-xs text-error">{cardError}</p>}

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
                className="text-sm px-4 py-1.5 rounded-lg bg-primary text-onAccent hover:bg-primaryHover transition font-medium"
              >
                Open @{BOT_USERNAME}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

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

export function IntegrationsView() {
  const t = useTranslations("Integrations");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-textMain">{t("title")}</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <TelegramCard />
        <VKCard />
        <StubCard name="Instagram" />
        <StubCard name="YouTube"   />
        <StubCard name="TikTok"    />
      </div>
    </div>
  );
}
