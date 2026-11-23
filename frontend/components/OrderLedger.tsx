"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  ChevronUpIcon,
  FileTextIcon,
  PlusIcon,
  ScaleIcon,
  SearchIcon,
  XIcon,
  ZapIcon,
} from "./Icons";
import { Language, translations } from "../data/translations";
import { useToast } from "./ToastProvider";

export interface OrderItem {
  order_id: string;
  buyer: string;
  product: string;
  quantity: number;
  total_weight_kg: number;
  total_value_usd: number;
  gas_intensity: string;
  base_smv: number;
  penalty_per_day_usd: number;
  cancel_threshold_days: number;
  promised_ship_date: string;
  actual_completion_date?: string;
  lead_days: number;
  days_late: number;
  is_late: number;
  air_freight_penalty_usd: number;
  total_exposure_usd: number;
  predicted_prob_late?: number;
  predicted_days_late?: number;
  conformal_interval_90?: [number, number];
  simulated_exposure_usd?: number;
  simulated_is_late?: number;
  is_custom?: boolean;
  current_psi?: number;
  current_dyeing_cap?: number;
  shap_attribution?: {
    primary_risk_driver: string;
    explanation: string;
    feature_attributions: {
      dyeing_gas_collapse_pct: number;
      lead_slack_deficit_pct: number;
      garment_smv_complexity_pct: number;
      batch_volume_scale_pct: number;
    };
    drivers_list: Array<{
      factor: string;
      pct: number;
      category: string;
    }>;
  };
}

type SortKey = "order_id" | "promised_ship_date" | "prob_late" | "days_late" | "exposure";
type SortDir = "ascending" | "descending";

interface OrderLedgerProps {
  orders: OrderItem[];
  onSelectOrder: (order: OrderItem) => void;
  onOpenAddModal?: () => void;
  onOpenForceMajeure?: (order: OrderItem) => void;
  lang?: Language;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export default function OrderLedger({
  orders,
  onSelectOrder,
  onOpenAddModal,
  onOpenForceMajeure,
  lang = "en",
}: OrderLedgerProps) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | "AT_RISK" | "ON_TRACK" | "HIGH_GAS">("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("exposure");
  const [sortDir, setSortDir] = useState<SortDir>("descending");
  const [sortAnnouncement, setSortAnnouncement] = useState("");
  const t = translations[lang];

  const handleSort = (key: SortKey, label: string) => {
    const nextDir: SortDir =
      sortKey === key ? (sortDir === "ascending" ? "descending" : "ascending") : "descending";
    setSortKey(key);
    setSortDir(nextDir);
    setSortAnnouncement(`Sorted by ${label}, ${nextDir}`);
  };

  const filteredAndSortedOrders = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = orders.filter((o) => {
      const matchesSearch =
        o.order_id.toLowerCase().includes(q) ||
        o.buyer.toLowerCase().includes(q) ||
        o.product.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      const isLate = o.simulated_is_late !== undefined ? o.simulated_is_late === 1 : o.is_late === 1;
      if (filter === "AT_RISK") return isLate;
      if (filter === "ON_TRACK") return !isLate;
      if (filter === "HIGH_GAS")
        return Boolean(o.gas_intensity?.includes("HIGH") || o.gas_intensity?.includes("EXTREME"));
      return true;
    });

    const factor = sortDir === "ascending" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "order_id") {
        return factor * collator.compare(a.order_id, b.order_id);
      }
      if (sortKey === "promised_ship_date") {
        return factor * (Date.parse(a.promised_ship_date) - Date.parse(b.promised_ship_date));
      }
      if (sortKey === "prob_late") {
        const aIsLate = a.simulated_is_late !== undefined ? a.simulated_is_late === 1 : a.is_late === 1;
        const bIsLate = b.simulated_is_late !== undefined ? b.simulated_is_late === 1 : b.is_late === 1;
        const ap = a.predicted_prob_late ?? (aIsLate ? 0.95 : 0.05);
        const bp = b.predicted_prob_late ?? (bIsLate ? 0.95 : 0.05);
        return factor * (ap - bp);
      }
      if (sortKey === "days_late") {
        const ad = (a.predicted_days_late ?? a.days_late) || 0;
        const bd = (b.predicted_days_late ?? b.days_late) || 0;
        return factor * (ad - bd);
      }
      const ae = (a.simulated_exposure_usd ?? a.total_exposure_usd) || 0;
      const be = (b.simulated_exposure_usd ?? b.total_exposure_usd) || 0;
      return factor * (ae - be);
    });
  }, [orders, search, filter, sortKey, sortDir]);

  const lateCount = orders.filter((o) =>
    o.simulated_is_late !== undefined ? o.simulated_is_late === 1 : o.is_late === 1
  ).length;

  const buyerExposure = useMemo(() => {
    const map: Record<string, { totalOrders: number; lateOrders: number; exposureUSD: number }> = {};
    orders.forEach((o) => {
      const b = o.buyer || "Other";
      if (!map[b]) map[b] = { totalOrders: 0, lateOrders: 0, exposureUSD: 0 };
      map[b].totalOrders += 1;
      const isLate = o.simulated_is_late !== undefined ? o.simulated_is_late === 1 : o.is_late === 1;
      if (isLate) map[b].lateOrders += 1;
      map[b].exposureUSD += (o.simulated_exposure_usd ?? o.total_exposure_usd) || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].exposureUSD - a[1].exposureUSD);
  }, [orders]);

  const handleExportCSV = () => {
    const headers = [
      "Order ID",
      "Buyer",
      "Product",
      "Quantity",
      "Weight (kg)",
      "Promised Ship Date",
      "Projected Days Late",
      "Late Status",
      "Financial Exposure (USD)",
    ];
    const rows = filteredAndSortedOrders.map((o) => {
      const days = (o.predicted_days_late ?? o.days_late) || 0;
      const exp = (o.simulated_exposure_usd ?? o.total_exposure_usd) || 0;
      return [
        o.order_id,
        `"${o.buyer}"`,
        `"${o.product}"`,
        o.quantity,
        o.total_weight_kg,
        o.promised_ship_date,
        days.toFixed(1),
        (o.simulated_is_late !== undefined ? o.simulated_is_late : o.is_late) === 1 ? "LATE" : "ON_TIME",
        exp.toFixed(2),
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gasline_orders_ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Order Ledger Exported", `${filteredAndSortedOrders.length} garment lots saved to CSV.`);
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ChevronsUpDownIcon className="h-3.5 w-3.5 text-ink-muted opacity-50" />;
    }
    return sortDir === "ascending" ? (
      <ChevronUpIcon className="h-3.5 w-3.5 text-ink" />
    ) : (
      <ChevronDownIcon className="h-3.5 w-3.5 text-ink" />
    );
  };

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-2xs">
      {/* Controls Bar */}
      <div className="flex flex-col justify-between gap-3 border-b border-line p-4 md:flex-row md:items-center">
        <div className="scroll-fade-x flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filter === "ALL" ? "bg-accent text-accent-fg" : "bg-surface-2 text-ink-2 hover:text-ink"
            }`}
          >
            {t.allLots} ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("AT_RISK")}
            className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filter === "AT_RISK"
                ? "bg-rose-600 text-white"
                : "bg-surface-2 text-ink-2 hover:text-ink"
            }`}
          >
            {t.delayedRisk} ({lateCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("ON_TRACK")}
            className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filter === "ON_TRACK"
                ? "bg-emerald-600 text-white"
                : "bg-surface-2 text-ink-2 hover:text-ink"
            }`}
          >
            {t.onSchedule} ({orders.length - lateCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("HIGH_GAS")}
            className={`shrink-0 rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filter === "HIGH_GAS" ? "bg-accent text-accent-fg" : "bg-surface-2 text-ink-2 hover:text-ink"
            }`}
          >
            {t.gasIntensive}
          </button>
        </div>

        <div className="flex w-full items-center gap-2 md:w-auto">
          <div className="relative flex-1 md:w-64">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-ink-muted">
              <SearchIcon className="h-3.5 w-3.5" />
            </div>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              aria-label={t.searchPlaceholder}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface-2 py-1.5 pl-8 pr-7 text-xs text-ink placeholder:text-ink-muted focus:border-line-strong focus:bg-surface focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute inset-y-0 right-0 flex items-center pr-2 text-ink-muted hover:text-ink"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-2 shadow-2xs transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink"
          >
            <FileTextIcon className="h-3.5 w-3.5 text-ink-muted" />
            <span>{t.exportCSV}</span>
          </button>

          {onOpenAddModal && (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg shadow-2xs transition-opacity hover:opacity-90"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span>{t.inputGarmentBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Buyer Relationship Exposure Strip */}
      <div className="border-b border-line bg-surface-2/40 px-4 py-2.5">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            <span>{lang === "en" ? "Buyer Exposure:" : "বায়ার ঝুঁকি:"}</span>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] font-medium normal-case text-ink-2 underline-offset-2 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="scroll-fade-x flex items-center gap-2 pb-0.5">
            {buyerExposure.map(([buyerName, stat]) => {
              const isSelected = search.toLowerCase() === buyerName.toLowerCase();
              return (
                <button
                  key={buyerName}
                  type="button"
                  onClick={() => setSearch(isSelected ? "" : buyerName)}
                  className={`font-tabular flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-all ${
                    isSelected
                      ? "border-accent bg-accent text-accent-fg shadow-2xs"
                      : "border-line bg-surface text-ink-2 hover:border-line-strong"
                  }`}
                  title={`Filter ledger by ${buyerName}`}
                >
                  <span className="font-semibold">{buyerName}</span>
                  <span
                    className={
                      isSelected
                        ? "opacity-90"
                        : stat.lateOrders > 0
                        ? "font-bold text-[var(--status-critical-text)]"
                        : "text-[var(--status-safe-text)]"
                    }
                  >
                    {stat.lateOrders > 0 ? `(${stat.lateOrders} late)` : "Safe"}
                  </span>
                  <span className="opacity-40">·</span>
                  <span className="font-semibold">${(stat.exposureUSD / 1000).toFixed(0)}k</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Screen-reader sort announcement */}
      <div role="status" className="sr-only">
        {sortAnnouncement}
      </div>

      {/* Sortable Sticky-Header Ledger Table */}
      <div
        role="region"
        aria-labelledby="order-ledger-caption"
        tabIndex={0}
        className="scroll-shadow-y gasline-scroll max-h-[560px] overflow-auto"
      >
        <table className="min-w-[860px] w-full border-collapse text-left text-xs">
          <caption id="order-ledger-caption" className="sr-only">
            RMG Export Order Risk and Rescue Ledger
          </caption>
          <thead className="sticky top-0 z-10 bg-surface-2/95 backdrop-blur-xs">
            <tr className="border-b border-line text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              <th
                scope="col"
                aria-sort={sortKey === "order_id" ? sortDir : undefined}
                className="p-0"
              >
                <button
                  type="button"
                  onClick={() => handleSort("order_id", t.orderIdBuyer)}
                  className="flex w-full items-center gap-1 px-4 py-3 text-left transition-colors hover:text-ink"
                >
                  <span>{t.orderIdBuyer}</span>
                  {renderSortIcon("order_id")}
                </button>
              </th>
              <th scope="col" className="px-4 py-3">
                {t.garmentWeight}
              </th>
              <th scope="col" className="px-4 py-3">
                {t.gasIntensity}
              </th>
              <th
                scope="col"
                aria-sort={sortKey === "promised_ship_date" ? sortDir : undefined}
                className="p-0"
              >
                <button
                  type="button"
                  onClick={() => handleSort("promised_ship_date", t.dueDate)}
                  className="flex w-full items-center gap-1 px-4 py-3 text-left transition-colors hover:text-ink"
                >
                  <span>{t.dueDate}</span>
                  {renderSortIcon("promised_ship_date")}
                </button>
              </th>
              <th
                scope="col"
                aria-sort={sortKey === "prob_late" ? sortDir : undefined}
                className="p-0"
              >
                <button
                  type="button"
                  onClick={() => handleSort("prob_late", t.lateRisk)}
                  className="flex w-full items-center gap-1 px-4 py-3 text-left transition-colors hover:text-ink"
                >
                  <span>{t.lateRisk}</span>
                  {renderSortIcon("prob_late")}
                </button>
              </th>
              <th
                scope="col"
                aria-sort={sortKey === "days_late" ? sortDir : undefined}
                className="p-0"
              >
                <button
                  type="button"
                  onClick={() => handleSort("days_late", t.projectedDelay)}
                  className="flex w-full items-center gap-1 px-4 py-3 text-left transition-colors hover:text-ink"
                >
                  <span>{t.projectedDelay}</span>
                  {renderSortIcon("days_late")}
                </button>
              </th>
              <th
                scope="col"
                aria-sort={sortKey === "exposure" ? sortDir : undefined}
                className="p-0"
              >
                <button
                  type="button"
                  onClick={() => handleSort("exposure", t.exposureUSD)}
                  className="flex w-full items-center justify-end gap-1 px-4 py-3 text-right transition-colors hover:text-ink"
                >
                  <span>{t.exposureUSD}</span>
                  {renderSortIcon("exposure")}
                </button>
              </th>
              <th scope="col" className="px-4 py-3 text-center">
                {t.action}
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {filteredAndSortedOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <p className="text-sm font-medium text-ink">No matching garment lots</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Adjust your search query or risk filter to inspect orders.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setFilter("ALL");
                    }}
                    className="mt-3 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface"
                  >
                    Reset filters
                  </button>
                </td>
              </tr>
            ) : (
              filteredAndSortedOrders.map((order) => {
                const isLate =
                  order.simulated_is_late !== undefined
                    ? order.simulated_is_late === 1
                    : order.is_late === 1;
                const daysLate = (order.predicted_days_late ?? order.days_late) || 0;
                const exposure = (order.simulated_exposure_usd ?? order.total_exposure_usd) || 0;
                const pLate =
                  order.predicted_prob_late !== undefined
                    ? order.predicted_prob_late
                    : isLate
                    ? 0.95
                    : 0.05;
                const driverLabel =
                  order.shap_attribution?.primary_risk_driver ||
                  (order.gas_intensity?.includes("HIGH") || order.gas_intensity?.includes("EXTREME")
                    ? "Dyeing Gas Shock"
                    : "Lead Slack Deficit");

                return (
                  <tr
                    key={order.order_id}
                    onClick={() => onSelectOrder(order)}
                    className={`cursor-pointer border-l-2 transition-colors hover:bg-surface-2/60 ${
                      isLate ? "border-l-rose-500" : "border-l-transparent"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-ink">{order.order_id}</span>
                        {order.is_custom && (
                          <span className="rounded border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--status-info-text)]">
                            {t.customBadge || "Custom"}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-[11px] font-medium text-ink-muted">{order.buyer}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{order.product}</div>
                      <div className="font-tabular mt-0.5 font-mono text-[11px] text-ink-muted">
                        {order.quantity.toLocaleString()} pcs · {order.total_weight_kg.toLocaleString()} kg
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded border px-2 py-0.5 text-[10px] font-medium ${
                          order.gas_intensity?.includes("EXTREME")
                            ? "border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] text-[var(--status-critical-text)]"
                            : order.gas_intensity?.includes("HIGH")
                            ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
                            : "border-line bg-surface-2 text-ink-2"
                        }`}
                      >
                        {order.gas_intensity || "NORMAL"}
                      </span>
                    </td>

                    <td className="font-tabular px-4 py-3 font-mono text-ink-2">
                      <div>{order.promised_ship_date}</div>
                      <div className="text-[10px] text-ink-muted">{order.lead_days}d lead time</div>
                    </td>

                    <td className="px-4 py-3">
                      {isLate ? (
                        <div className="max-w-[160px]">
                          <div className="flex items-center justify-between gap-2 font-mono text-[11px] font-semibold text-[var(--status-critical-text)]">
                            <span className="inline-flex items-center gap-1">
                              <AlertTriangleIcon className="h-3 w-3 shrink-0" />
                              <span className="font-tabular">{(pLate * 100).toFixed(0)}% Late</span>
                            </span>
                          </div>
                          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-2">
                            <div
                              className="h-full rounded-full bg-rose-500"
                              style={{ width: `${Math.min(100, pLate * 100)}%` }}
                            />
                          </div>
                          <div
                            className="mt-1 flex items-center gap-1 truncate font-mono text-[10px] text-ink-muted"
                            title={order.shap_attribution?.explanation || "Model B Feature Attribution"}
                          >
                            <ZapIcon className="h-2.5 w-2.5 shrink-0 text-amber-500" />
                            <span className="truncate">{driverLabel}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--status-safe-text)]">
                          <CheckCircleIcon className="h-3 w-3" />
                          <span>{lang === "en" ? "On Schedule" : "ঠিক সময়ে"}</span>
                        </span>
                      )}
                    </td>

                    <td className="font-tabular px-4 py-3 font-mono">
                      {isLate ? (
                        <div>
                          <span className="font-bold text-[var(--status-critical-text)]">
                            +{daysLate.toFixed(1)}d
                          </span>
                          {order.conformal_interval_90 && (
                            <div className="text-[10px] text-ink-muted">
                              90%: [{order.conformal_interval_90[0]}, {order.conformal_interval_90[1]}]d
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-ink-muted">0.0d</span>
                      )}
                    </td>

                    <td className="font-tabular px-4 py-3 text-right font-mono font-medium">
                      {exposure > 0 ? (
                        <span className="font-bold text-ink">${exposure.toLocaleString()}</span>
                      ) : (
                        <span className="text-ink-muted">$0</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div
                        className="flex items-center justify-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectOrder(order)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                            isLate
                              ? "bg-accent text-accent-fg shadow-2xs hover:opacity-90"
                              : "border border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-surface-2 hover:text-ink"
                          }`}
                        >
                          {isLate ? t.rescuePlan : t.inspect}
                        </button>

                        {isLate && onOpenForceMajeure && (
                          <button
                            type="button"
                            onClick={() => onOpenForceMajeure(order)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-2 py-1 text-xs font-medium text-[var(--status-info-text)] transition-colors hover:opacity-85"
                            title="Generate Statutory Force Majeure Certificate (BERC Act 2003 §42)"
                          >
                            <ScaleIcon className="h-3 w-3" />
                            <span>Relief</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
