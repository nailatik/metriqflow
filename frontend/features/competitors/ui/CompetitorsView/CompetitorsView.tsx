"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { observer } from "mobx-react-lite";
import { http } from "@/shared/lib/axios";
import { UpgradeBanner } from "@/features/billing/ui/UpgradeBanner/UpgradeBanner";
import { useUserStore, useCompetitorsStore } from "@/shared/store/StoreProvider";
import type { CompareMetrics, CompareResponse } from "@/entities/competitor/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 10 * 60 * 1000;
const LS_PREFIX    = "mf_comp:";

// ─── Module-level cache ───────────────────────────────────────────────────────
// memCache  — L1, lives for the browser-tab lifetime (survives SPA navigation).
// localStorage — L2, survives tab close / F5 (cleared only on explicit logout or quota).
// Keys include userId so different accounts on the same browser never share data.

type CacheEntry = { data: CompareResponse; ts: number };
const memCache = new Map<string, CacheEntry>();

function cacheRead(key: string): CacheEntry | null {
  const mem = memCache.get(key);
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw) {
      const entry = JSON.parse(raw) as CacheEntry;
      memCache.set(key, entry);
      return entry;
    }
  } catch { /* localStorage unavailable (SSR / private mode) */ }
  return null;
}

function cacheWrite(key: string, entry: CacheEntry): void {
  memCache.set(key, entry);
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry));
  } catch { /* quota exceeded or SSR */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

function competitorUrl(platform: string, identifier: string): string {
  if (platform === "tg") return `https://t.me/${identifier}`;
  return `https://vk.com/club${identifier}`;
}

function ErBadge({ basis }: { basis: CompareMetrics["er_basis"] }) {
  if (basis === "full")           return null;
  if (basis === "reactions_only") return <span className="ml-1 text-[10px] text-amber-500 bg-amber-50 border border-amber-200 rounded px-1">≈ реакции</span>;
  return <span className="ml-1 text-[10px] text-textSecondary">—</span>;
}

type MetricKey = "subscribers" | "avg_views" | "er" | "post_freq";

const METRIC_LABELS: Record<MetricKey, string> = {
  subscribers: "Подписчики",
  avg_views:   "Ср. просмотры",
  er:          "ER %",
  post_freq:   "Постов/нед.",
};

type OwnChannel = { id: number; name: string };

// ─── Sub-components ───────────────────────────────────────────────────────────

function CompareRow({
  label, own, rival, erBasis, formatter,
}: {
  label: string;
  own: number | null;
  rival: number | null;
  erBasis?: CompareMetrics["er_basis"];
  formatter?: (n: number) => string;
}) {
  const f = formatter ?? fmt;
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-4 text-sm text-textSecondary w-36">{label}</td>
      <td className="py-3 pr-4 text-sm font-semibold text-textMain">
        {own !== null ? f(own) : <span className="text-textSecondary">—</span>}
      </td>
      <td className="py-3 text-sm font-semibold text-primary">
        {rival !== null ? (
          <>
            {f(rival)}
            {erBasis && <ErBadge basis={erBasis} />}
          </>
        ) : (
          <span className="text-textSecondary">
            —{erBasis && <ErBadge basis={erBasis} />}
          </span>
        )}
      </td>
    </tr>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export const CompetitorsView = observer(function CompetitorsView() {
  const t                = useTranslations("Competitors");
  const userStore        = useUserStore();
  const competitorsStore = useCompetitorsStore();
  const userId           = userStore.state.user?.id ?? null;

  const competitors    = competitorsStore.state.list;
  const listLoading    = !competitorsStore.state.loaded;

  const [listError,      setListError]      = useState<string | null>(null);
  const [addPlatform,    setAddPlatform]    = useState<"tg" | "vk">("tg");
  const [addInput,       setAddInput]       = useState("");
  const [addLoading,     setAddLoading]     = useState(false);
  const [addError,       setAddError]       = useState<string | null>(null);
  const [limitReached,   setLimitReached]   = useState(false);

  const [selectedId,     setSelectedId]     = useState<number | null>(null);
  const [period,         setPeriod]         = useState<"7d" | "30d">("7d");

  const [ownChannels,    setOwnChannels]    = useState<OwnChannel[]>([]);
  const [ownChannelId,   setOwnChannelId]   = useState<number | null>(null);

  const [compare,        setCompare]        = useState<CompareResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError,   setCompareError]   = useState<string | null>(null);

  const [lastFetchedAt,  setLastFetchedAt]  = useState<number | null>(null);
  const [minutesAgo,     setMinutesAgo]     = useState(0);

  const [chartMetric,    setChartMetric]    = useState<MetricKey>("avg_views");

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getCacheKey = (cId: number, p: string, oId: number | null) =>
    `${userId ?? "anon"}:${cId}:${p}:${oId ?? "all"}`;

  // "X min ago" ticker
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      if (lastFetchedAt !== null) {
        setMinutesAgo(Math.floor((Date.now() - lastFetchedAt) / 60_000));
      }
    }, 30_000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [lastFetchedAt]);

  // Load list via store (no re-fetch if already loaded)
  useEffect(() => {
    competitorsStore.fetch().catch(() => setListError(t("loadError")));
  }, [competitorsStore, t]);

  useEffect(() => {
    if (selectedId === null && competitors.length > 0) {
      setSelectedId(competitors[0]!.id);
    }
  }, [competitors, selectedId]);

  // Load own channels when competitor changes
  useEffect(() => {
    if (selectedId === null) return;
    const comp = competitors.find((c) => c.id === selectedId);
    if (!comp) return;
    setOwnChannels([]);
    setOwnChannelId(null);
    if (comp.platform === "tg") {
      http.get<{ id: number; title: string }[]>("/integrations/telegram/channels")
        .then((r) => {
          const list = r.data.map((c) => ({ id: c.id, name: c.title }));
          setOwnChannels(list);
          if (list.length > 0) setOwnChannelId(list[0]!.id);
        })
        .catch(() => {});
    } else {
      http.get<{ id: number; name: string }[]>("/vk/communities")
        .then((r) => {
          const list = r.data.map((c) => ({ id: c.id, name: c.name }));
          setOwnChannels(list);
          if (list.length > 0) setOwnChannelId(list[0]!.id);
        })
        .catch(() => {});
    }
  }, [selectedId, competitors]);

  // Load compare — checks cache first, fetches only if stale or forced
  const loadCompare = useCallback((
    compId: number,
    p: "7d" | "30d",
    ownId: number | null,
    force = false,
  ) => {
    const key    = getCacheKey(compId, p, ownId);
    const cached = cacheRead(key);

    if (!force && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      setCompare(cached.data);
      setLastFetchedAt(cached.ts);
      setMinutesAgo(Math.floor((Date.now() - cached.ts) / 60_000));
      return;
    }

    setCompareLoading(true);
    setCompareError(null);
    const ownParam = ownId !== null ? `&own_channel_id=${ownId}` : "";
    http.get<CompareResponse>(`/competitors/${compId}/compare?period=${p}${ownParam}`)
      .then((r) => {
        const ts = Date.now();
        cacheWrite(key, { data: r.data, ts });
        setCompare(r.data);
        setLastFetchedAt(ts);
        setMinutesAgo(0);
      })
      .catch((e: unknown) => {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setCompareError(msg ?? t("loadError"));
        setCompare(null);
      })
      .finally(() => setCompareLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // Trigger compare when selection / period / own channel changes
  useEffect(() => {
    if (selectedId !== null) {
      setCompare(null);
      loadCompare(selectedId, period, ownChannelId);
    }
  }, [selectedId, period, ownChannelId, loadCompare]);

  // Add competitor
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addInput.trim()) return;
    setAddLoading(true);
    setAddError(null);
    setLimitReached(false);
    competitorsStore.add(addPlatform, addInput.trim())
      .then((result) => {
        if (result.ok) {
          setAddInput("");
          setSelectedId(result.competitor.id);
        } else if ("upgrade" in result) {
          setLimitReached(true);
        } else {
          setAddError(result.message ?? t("addError"));
        }
      })
      .finally(() => setAddLoading(false));
  };

  const handleRemove = (id: number) => {
    competitorsStore.remove(id).then((ok) => {
      if (ok && selectedId === id) {
        const rest = competitors.filter((c) => c.id !== id);
        setSelectedId(rest.length > 0 ? rest[0]!.id : null);
      }
    });
  };

  const handleForceRefresh = () => {
    if (selectedId !== null) loadCompare(selectedId, period, ownChannelId, true);
  };

  const selectedComp = competitors.find((c) => c.id === selectedId);
  const ownLabel     = ownChannels.find((c) => c.id === ownChannelId)?.name ?? t("ownChannel");
  const rivalLabel   = compare?.competitor.title ?? compare?.competitor.identifier ?? t("competitor");
  const canRefresh   = lastFetchedAt === null || minutesAgo >= 10;

  const chartData = compare ? [
    {
      name:         METRIC_LABELS[chartMetric],
      [ownLabel]:   compare.own?.[chartMetric]    ?? 0,
      [rivalLabel]: compare.rival[chartMetric]    ?? 0,
    },
  ] : [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-textMain">{t("title")}</h1>
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {(["7d", "30d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                period === p ? "bg-primary text-white" : "text-textSecondary hover:text-textMain"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Add form */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest mb-3">{t("addTitle")}</p>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
          <div className="flex gap-1 bg-bg border border-border rounded-lg p-1">
            {(["tg", "vk"] as const).map((pl) => (
              <button
                key={pl}
                type="button"
                onClick={() => setAddPlatform(pl)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                  addPlatform === pl ? "bg-primary text-white" : "text-textSecondary hover:text-textMain"
                }`}
              >
                {pl === "tg" ? "Telegram" : "VK"}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            placeholder={addPlatform === "tg" ? t("placeholderTg") : t("placeholderVk")}
            className="flex-1 min-w-48 text-sm bg-bg border border-border rounded-lg px-3 py-1.5 text-textMain outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={addLoading || !addInput.trim()}
            className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {addLoading ? t("adding") : t("addBtn")}
          </button>
        </form>
        {addError    && <p className="text-sm text-error mt-2">{addError}</p>}
        {limitReached && <UpgradeBanner compact reason={t("limitReached")} />}
      </div>

      {/* List */}
      {listLoading && <p className="text-sm text-textSecondary">{t("loading")}</p>}
      {listError   && <p className="text-sm text-error">{listError}</p>}

      {!listLoading && competitors.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[200px] text-center gap-2">
          <p className="text-3xl">🏆</p>
          <p className="text-textMain font-semibold">{t("empty")}</p>
          <p className="text-sm text-textSecondary max-w-sm">{t("emptyDesc")}</p>
        </div>
      )}

      {competitors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {competitors.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition ${
                selectedId === c.id
                  ? "border-primary bg-primary/5 text-textMain"
                  : "border-border bg-surface text-textSecondary hover:border-primary/50"
              }`}
              onClick={() => setSelectedId(c.id)}
            >
              {c.photo_url && (
                <img src={c.photo_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              )}
              <span className="text-sm font-medium">
                <span className="text-xs mr-1 opacity-60">{c.platform.toUpperCase()}</span>
                {c.title ?? c.identifier}
              </span>
              {c.subscriber_count !== null && (
                <span className="text-xs text-textSecondary">{fmt(c.subscriber_count)}</span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleRemove(c.id); }}
                className="ml-1 text-textSecondary hover:text-error text-xs"
                title={t("remove")}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Own channel selector */}
      {selectedComp && ownChannels.length > 0 && (
        <div className="flex items-center gap-3 bg-surface border border-border rounded-xl px-5 py-3 flex-wrap">
          <span className="text-sm text-textSecondary flex-shrink-0">{t("ownChannelLabel")}</span>
          <select
            value={ownChannelId ?? ""}
            onChange={(e) => setOwnChannelId(Number(e.target.value))}
            className="text-sm bg-bg border border-border rounded-lg px-3 py-1.5 text-textMain outline-none focus:border-primary"
          >
            {ownChannels.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className="text-xs text-textSecondary">vs</span>
          <a
            href={competitorUrl(selectedComp.platform, selectedComp.identifier)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedComp.title ?? selectedComp.identifier} ↗
          </a>
        </div>
      )}

      {selectedComp && ownChannels.length === 0 && !listLoading && (
        <div className="bg-surface border border-border rounded-xl px-5 py-3">
          <p className="text-sm text-textSecondary">
            {selectedComp.platform === "tg" ? t("noOwnTg") : t("noOwnVk")}
          </p>
        </div>
      )}

      {/* Compare area */}
      {selectedId !== null && (
        <>
          {compareLoading && !compare && (
            <p className="text-sm text-textSecondary">{t("loading")}</p>
          )}
          {compareError && !compareLoading && (
            <div className="bg-error/5 border border-error/30 rounded-xl px-5 py-4">
              <p className="text-sm text-error">{compareError}</p>
            </div>
          )}

          {compare && (
            <>
              {/* Side-by-side table */}
              <div className="bg-surface border border-border rounded-xl p-6 overflow-x-auto">
                {/* Table header row */}
                <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                  <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest">
                    {t("comparison")}
                  </p>
                  <div className="flex items-center gap-3">
                    {lastFetchedAt !== null && (
                      <span className="text-xs text-textSecondary">
                        {minutesAgo === 0
                          ? t("justUpdated")
                          : t("updatedAgo", { min: minutesAgo })}
                        {" · "}
                        {t("refreshEvery10")}
                      </span>
                    )}
                    <button
                      onClick={handleForceRefresh}
                      disabled={!canRefresh || compareLoading}
                      title={canRefresh ? t("refreshNow") : t("refreshIn", { min: 10 - minutesAgo })}
                      className="text-xs text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                    >
                      {compareLoading ? t("refreshing") : t("refreshNow")}
                    </button>
                  </div>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs text-textSecondary font-medium pb-2 w-36"></th>
                      <th className="text-left text-xs text-textSecondary font-medium pb-2 pr-4">{ownLabel}</th>
                      <th className="text-left text-xs text-textSecondary font-medium pb-2">{rivalLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <CompareRow label={t("subscribers")} own={compare.own?.subscribers ?? null} rival={compare.rival.subscribers} />
                    <CompareRow label={t("avgViews")}    own={compare.own?.avg_views ?? null}   rival={compare.rival.avg_views} />
                    <CompareRow
                      label="ER %"
                      own={compare.own?.er ?? null}
                      rival={compare.rival.er}
                      erBasis={compare.rival.er_basis}
                      formatter={(n) => `${n.toFixed(2)}%`}
                    />
                    <CompareRow
                      label={t("postFreq")}
                      own={compare.own?.post_freq ?? null}
                      rival={compare.rival.post_freq}
                      formatter={(n) => n.toFixed(1)}
                    />
                  </tbody>
                </table>
              </div>

              {/* Bar chart */}
              <div className="bg-surface border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-textSecondary uppercase tracking-widest">
                    {t("chart")}
                  </p>
                  <select
                    value={chartMetric}
                    onChange={(e) => setChartMetric(e.target.value as MetricKey)}
                    className="text-sm bg-bg border border-border rounded-lg px-2 py-1 text-textMain outline-none focus:border-primary"
                  >
                    {(Object.entries(METRIC_LABELS) as [MetricKey, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} tickFormatter={fmt} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(val) => [
                        typeof val === "number"
                          ? (chartMetric === "er" ? `${val.toFixed(2)}%` : fmt(val))
                          : val,
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey={ownLabel}   fill="#4F46E5" radius={[4,4,0,0]} />
                    <Bar dataKey={rivalLabel} fill="#E54F7D" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="text-xs text-textSecondary">
                {t("postsN", { n: compare.rival.posts_sampled })}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
});
