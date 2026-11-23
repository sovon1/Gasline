"use client";

import React from "react";
import { ClusterOption } from "../data/clusters";
import { Language } from "../data/translations";
import { ArrowRightIcon, CheckCircleIcon } from "./Icons";

interface NationalMapProps {
  activeCluster: ClusterOption;
  onSelectCluster: (cluster: ClusterOption) => void;
  clusters: ClusterOption[];
  currentPsi: number;
  lang: Language;
}

const CLUSTER_POSITIONS: Record<
  string,
  { xPct: number; yPct: number; align: "left" | "right"; shortLabel: string }
> = {
  chattogram: { xPct: 35, yPct: 68, align: "right", shortLabel: "Chattogram (KEPZ)" },
  narayanganj: { xPct: 64, yPct: 40, align: "right", shortLabel: "Narayanganj" },
  savar: { xPct: 74, yPct: 30, align: "left", shortLabel: "Savar & Ashulia" },
  gazipur: { xPct: 84, yPct: 19, align: "left", shortLabel: "Gazipur Epicenter" },
};

export default function NationalMap({
  activeCluster,
  onSelectCluster,
  clusters,
  currentPsi,
  lang,
}: NationalMapProps) {
  const nationalExportAtRiskUSD = 84_200_000;
  const nationalFactoriesAffected = 412;
  const nationalGasDeficitMmcfd = 650;

  return (
    <section className="space-y-6 rounded-xl border border-line bg-surface p-6 shadow-2xs">
      {/* Title & National Telemetry Banner */}
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-accent px-2 py-0.5 font-mono text-xs font-bold text-accent-fg">
              Seeded Pressure Network (BKMEA / Petrobangla)
            </span>
            <span className="rounded border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--status-critical-text)]">
              National Grid Deficit
            </span>
          </div>
          <h2 className="mt-1.5 text-base font-bold tracking-tight text-ink">
            {lang === "en"
              ? "National RMG Energy Disruption GIS Corridor"
              : "জাতীয় গ্যাস পাইপলাইন ট্রান্সমিশন ও আরএমজি করিডোর"}
          </h2>
          <p className="mt-0.5 max-w-2xl text-xs text-ink-muted">
            {lang === "en"
              ? "Seeded zone-pressure topology tracking natural gas transmission from Maheshkhali offshore LNG terminals across Bangladesh's 4 primary export corridors."
              : "মহেশখালী এলএনজি টার্মিনাল থেকে জাতীয় সঞ্চালন পাইপলাইনের মাধ্যমে দেশের ৪টি প্রধান পোশাক রপ্তানি জোনে গ্যাস সরবরাহের সীডেড জোন-প্রেশার টপোলজি।"}
          </p>
        </div>

        {/* National Macro Stat Pills */}
        <div className="font-tabular grid grid-cols-2 gap-2.5 self-start font-mono text-xs sm:grid-cols-3 md:self-auto">
          <div className="rounded-lg border border-line bg-surface-2 p-2.5">
            <span className="block text-[10px] uppercase text-ink-muted">National Risk</span>
            <strong className="text-sm font-bold text-[var(--status-critical-text)]">
              ${(nationalExportAtRiskUSD / 1_000_000).toFixed(1)}M USD
            </strong>
          </div>
          <div className="rounded-lg border border-line bg-surface-2 p-2.5">
            <span className="block text-[10px] uppercase text-ink-muted">Plants Affected</span>
            <strong className="text-sm font-bold text-ink">{nationalFactoriesAffected} factories</strong>
          </div>
          <div className="col-span-2 rounded-lg border border-line bg-surface-2 p-2.5 sm:col-span-1">
            <span className="block text-[10px] uppercase text-ink-muted">Grid Deficit</span>
            <strong className="text-sm font-bold text-[var(--status-warning-text)]">
              -{nationalGasDeficitMmcfd} mmcfd
            </strong>
          </div>
        </div>
      </div>

      {/* Interactive Corridor Map */}
      <div className="relative overflow-hidden rounded-xl border border-line bg-surface-2/60 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Spatial Transmission Topology (Bay of Bengal → Dhaka / Gazipur)
          </span>
          <span className="font-mono text-[11px] text-ink-muted">
            Click any cluster node on the corridor to switch live sensor
          </span>
        </div>

        <div className="relative h-80 w-full select-none">
          <svg
            viewBox="0 0 900 320"
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <pattern id="gisGrid" width="45" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 45 0 L 0 0 0 40"
                  fill="none"
                  stroke="var(--border-subtle)"
                  strokeWidth="0.7"
                  opacity="0.6"
                />
              </pattern>
              <linearGradient id="pipelineSpineGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="45%" stopColor="#10b981" />
                <stop offset="75%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
            </defs>

            {/* Technical GIS Coordinate Grid */}
            <rect x="0" y="0" width="900" height="320" rx="8" fill="url(#gisGrid)" />

            {/* Stylized Bay of Bengal & Delta Silhouette */}
            <path
              d="M 40 318 C 120 295, 195 275, 255 280 C 310 285, 360 250, 420 265 C 495 285, 570 295, 670 318 L 40 318 Z"
              fill="#0ea5e9"
              opacity="0.08"
            />
            <path
              d="M 280 280 C 420 230, 560 190, 810 22"
              stroke="var(--border-strong)"
              strokeWidth="1"
              strokeDasharray="3 5"
              opacity="0.45"
            />

            {/* Compass Rose */}
            <g transform="translate(862, 32)">
              <circle cx="0" cy="0" r="14" stroke="var(--border-strong)" strokeWidth="1" fill="var(--surface-card)" />
              <text x="0" y="4" textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontFamily="monospace" fontWeight="bold">
                N ↑
              </text>
            </g>

            {/* Background Transmission Route Spine */}
            <path
              d="M 126 270 C 215 256, 265 236, 315 218 C 390 190, 445 170, 505 152 C 548 139, 566 132, 576 128 C 618 112, 646 102, 666 96 C 705 84, 732 72, 756 61"
              stroke="var(--border-strong)"
              strokeWidth="11"
              strokeLinecap="round"
            />
            {/* Animated Pressure-Gradient Flow */}
            <path
              d="M 126 270 C 215 256, 265 236, 315 218 C 390 190, 445 170, 505 152 C 548 139, 566 132, 576 128 C 618 112, 646 102, 666 96 C 705 84, 732 72, 756 61"
              stroke="url(#pipelineSpineGrad)"
              strokeWidth="5"
              strokeDasharray="18 14"
              strokeLinecap="round"
              className="scada-flow-animated"
              style={{ animation: "mapFlow 2.1s linear infinite" }}
            />

            {/* Source Node: Maheshkhali Offshore FSRU */}
            <g transform="translate(126, 270)">
              <circle cx="0" cy="0" r="11" fill="#0284c7" stroke="var(--surface-card)" strokeWidth="2.5" />
              <text x="18" y="-2" fill="var(--text-primary)" fontSize="11" fontWeight="bold" fontFamily="monospace">
                Maheshkhali FSRU
              </text>
              <text x="18" y="12" fill="var(--text-muted)" fontSize="10" fontFamily="monospace">
                2,250 mmcfd (-450 Maint)
              </text>
            </g>

            {/* Interconnect Node: Bakhrabad */}
            <g transform="translate(465, 164)">
              <circle cx="0" cy="0" r="7" fill="#f59e0b" stroke="var(--surface-card)" strokeWidth="2" />
              <text x="14" y="14" fill="var(--text-muted)" fontSize="9.5" fontFamily="monospace">
                Bakhrabad PRS
              </text>
            </g>
          </svg>

          {/* Interactive Clickable Cluster Pin Buttons */}
          {clusters.map((c) => {
            const pos = CLUSTER_POSITIONS[c.id];
            if (!pos) return null;
            const isSelected = c.id === activeCluster.id;
            const displayPsi = isSelected ? currentPsi : c.defaultPsi;
            const isCritical = displayPsi < 4.0;
            const isModerate = displayPsi >= 4.0 && displayPsi < 8.0;
            const dotClass = isCritical ? "bg-rose-500" : isModerate ? "bg-amber-500" : "bg-emerald-500";
            const badgeClass = isCritical
              ? "text-[var(--status-critical-text)]"
              : isModerate
              ? "text-[var(--status-warning-text)]"
              : "text-[var(--status-safe-text)]";

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCluster(c)}
                aria-pressed={isSelected}
                style={{ left: `${pos.xPct}%`, top: `${pos.yPct}%` }}
                className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
              >
                <span
                  className={`relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface shadow-md transition-transform group-hover:scale-110 ${
                    isSelected ? "ring-4 ring-ink/25 scale-110" : ""
                  } ${dotClass}`}
                >
                  {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>

                <span
                  className={`pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border px-2 py-1 text-left font-mono text-[10px] shadow-sm transition-colors ${
                    pos.align === "left" ? "right-8" : "left-8"
                  } ${
                    isSelected
                      ? "border-ink bg-surface text-ink font-semibold"
                      : "border-line bg-surface/95 text-ink-2 group-hover:border-line-strong"
                  }`}
                >
                  <span className="block font-sans text-[11px] font-semibold leading-tight text-ink">
                    {pos.shortLabel}
                  </span>
                  <span className={`font-tabular font-bold ${badgeClass}`}>
                    {displayPsi.toFixed(1)} PSI {isSelected ? "· Active" : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cluster Deep-Dive Selection Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {clusters.map((c) => {
          const isSelected = c.id === activeCluster.id;
          const displayPsi = isSelected ? currentPsi : c.defaultPsi;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCluster(c)}
              aria-pressed={isSelected}
              className={`flex flex-col justify-between rounded-xl border p-4 text-left text-xs transition-all ${
                isSelected
                  ? "border-ink bg-surface-2/80 ring-1 ring-ink shadow-xs"
                  : "border-line bg-surface hover:border-line-strong"
              }`}
            >
              <div className="w-full">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-ink">{c.name}</span>
                  <span
                    className={`font-tabular shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                      c.severity === "CRITICAL"
                        ? "border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] text-[var(--status-critical-text)]"
                        : c.severity === "MODERATE"
                        ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
                        : "border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] text-[var(--status-safe-text)]"
                    }`}
                  >
                    {displayPsi.toFixed(1)} PSI
                  </span>
                </div>

                <div className="mt-1 text-[11px] font-medium text-ink-2">{c.plantName}</div>
                <div className="mt-0.5 font-mono text-[10px] text-ink-muted">{c.gridProvider}</div>

                <p className="mt-2.5 line-clamp-2 text-[11px] leading-relaxed text-ink-muted">
                  {c.description}
                </p>
              </div>

              <div className="mt-3 flex w-full items-center justify-between border-t border-line pt-2.5">
                <span className="flex items-center gap-1 text-[10px] text-ink-muted">
                  {isSelected ? (
                    <>
                      <CheckCircleIcon className="h-3 w-3 text-[var(--status-safe-text)]" />
                      <span className="text-[var(--status-safe-text)] font-medium">Active Sensor</span>
                    </>
                  ) : (
                    <span>Click to Inspect</span>
                  )}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink">
                  <span>{isSelected ? "ACTIVE" : "SELECT"}</span>
                  {!isSelected && <ArrowRightIcon className="h-3 w-3" />}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
