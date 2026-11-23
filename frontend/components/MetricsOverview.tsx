"use client";

import React from "react";
import { AlertTriangleIcon, DollarSignIcon, FactoryIcon, FlameIcon, ShieldCheckIcon } from "./Icons";
import AnimatedCounter from "./AnimatedCounter";
import { Language, translations } from "../data/translations";

interface MetricsOverviewProps {
  psi: number;
  dyeingCap: number;
  totalOrders: number;
  ordersAtRisk: number;
  riskPct: number;
  totalExposureUSD: number;
  totalExposureBDT: number;
  lang?: Language;
}

export default function MetricsOverview({
  psi,
  dyeingCap,
  totalOrders,
  ordersAtRisk,
  riskPct,
  totalExposureUSD,
  totalExposureBDT,
  lang = "en",
}: MetricsOverviewProps) {
  const t = translations[lang];
  const isSevere = psi < 4.0;
  const isModerate = psi >= 4.0 && psi < 8.0;

  const rmMinimumWageBDT = 12500;
  const protectedCapitalBDT = Math.max(9125000, Math.round(totalExposureBDT * 0.15));
  const workersProtectedCount = Math.round(protectedCapitalBDT / rmMinimumWageBDT);

  return (
    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3 lg:grid-cols-5">
      {/* 1. Pipeline Pressure & Bottleneck */}
      <div className="rounded-xl border border-line bg-surface p-4 shadow-2xs transition-colors hover:border-line-strong">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
            {t.lineGasPressure}
          </span>
          <div
            className={`rounded-lg p-1.5 ${
              isSevere
                ? "bg-[var(--status-critical-bg)] text-[var(--status-critical-text)]"
                : isModerate
                ? "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
                : "bg-[var(--status-safe-bg)] text-[var(--status-safe-text)]"
            }`}
          >
            <FlameIcon className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <AnimatedCounter
            value={psi}
            decimals={1}
            className="font-mono text-2xl font-bold tracking-tight text-ink"
          />
          <span className="text-xs font-medium text-ink-muted">PSI</span>
          <span className="text-[10px] text-ink-muted">{t.psiReq}</span>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isSevere ? "bg-rose-500" : isModerate ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(100, (psi / 15.0) * 100)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-ink-muted">
          <span>{t.dyeingSteamCap}:</span>
          <strong
            className={`font-tabular ${
              isSevere ? "font-semibold text-[var(--status-critical-text)]" : "text-ink"
            }`}
          >
            {(dyeingCap * 100).toFixed(0)}%
          </strong>
        </div>
      </div>

      {/* 2. Order Book At-Risk */}
      <div className="rounded-xl border border-line bg-surface p-4 shadow-2xs transition-colors hover:border-line-strong">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
            {t.ordersAtRisk}
          </span>
          <div className="rounded-lg bg-[var(--status-critical-bg)] p-1.5 text-[var(--status-critical-text)]">
            <AlertTriangleIcon className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <AnimatedCounter
            value={ordersAtRisk}
            className={`font-mono text-2xl font-bold tracking-tight ${
              ordersAtRisk > 0 ? "text-[var(--status-critical-text)]" : "text-[var(--status-safe-text)]"
            }`}
          />
          <span className="text-xs text-ink-muted">
            of {totalOrders} {lang === "en" ? "lots" : "লট"}
          </span>
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="inline-flex items-center rounded border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--status-critical-text)]">
            <AnimatedCounter value={riskPct} decimals={1} suffix={`% ${t.delayed}`} />
          </span>
          <span className="font-mono text-[10px] text-ink-muted">P(late)&gt;50%</span>
        </div>
        <div className="mt-2 font-mono text-[10px] text-ink-muted">
          Threshold: Delivery vs gas drop
        </div>
      </div>

      {/* 3. Total Financial Exposure (USD) */}
      <div className="rounded-xl border border-line bg-surface p-4 shadow-2xs transition-colors hover:border-line-strong">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
            {t.grossExposure}
          </span>
          <div className="rounded-lg bg-surface-2 p-1.5 text-ink-2">
            <DollarSignIcon className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-mono text-2xl font-bold tracking-tight text-ink">
            <AnimatedCounter value={totalExposureUSD / 1_000_000} prefix="$" suffix="M" decimals={2} />
          </span>
          <span className="text-xs text-ink-muted">USD</span>
        </div>
        <div className="mt-2 truncate font-mono text-[11px] text-ink-2">
          ≈ ৳<AnimatedCounter value={totalExposureBDT / 10_000_000} decimals={1} suffix=" Cr BDT" />
        </div>
        <div className="mt-1 font-mono text-[10px] text-ink-muted">
          Air-freight ($6.65/kg) + Penalties
        </div>
      </div>

      {/* 4. Actionable Mitigation Engine */}
      <div className="rounded-xl border border-line bg-surface p-4 shadow-2xs transition-colors hover:border-line-strong">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
            {t.rescueEngineStatus}
          </span>
          <div className="rounded-lg bg-[var(--status-safe-bg)] p-1.5 text-[var(--status-safe-text)]">
            <ShieldCheckIcon className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-mono text-2xl font-bold tracking-tight text-[var(--status-safe-text)]">
            {t.activeLevers}
          </span>
          <span className="text-xs text-ink-muted">{t.active}</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
          <span className="truncate">{t.leversList}</span>
        </div>
        <div className="mt-1 font-mono text-[10px] text-ink-muted">Ranked by ROI & Net Savings</div>
      </div>

      {/* 5. Worker Welfare & Payroll Protection Shield */}
      <div className="rounded-xl border border-line bg-surface p-4 shadow-2xs transition-colors hover:border-line-strong">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--status-safe-text)]">
            Worker Welfare Shield
          </span>
          <div className="rounded-lg bg-[var(--status-safe-bg)] p-1.5 text-[var(--status-safe-text)]">
            <FactoryIcon className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-mono text-2xl font-bold tracking-tight text-[var(--status-safe-text)]">
            <AnimatedCounter value={workersProtectedCount} />
          </span>
          <span className="text-xs font-medium text-ink-muted">Salaries</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="inline-flex items-center rounded border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--status-safe-text)]">
            Zero Layoffs
          </span>
          <span className="font-mono text-[10px] text-ink-muted">Protected</span>
        </div>
        <div className="mt-1 truncate font-mono text-[10px] text-ink-muted">
          At ৳12,500/mo minimum wage
        </div>
      </div>
    </div>
  );
}
