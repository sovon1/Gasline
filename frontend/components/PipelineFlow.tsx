"use client";

import React from "react";
import { AlertTriangleIcon, ArrowRightIcon, CheckCircleIcon, FactoryIcon } from "./Icons";
import { Language, translations } from "../data/translations";

interface PipelineFlowProps {
  psi: number;
  dyeingCap: number;
  knittingCap: number;
  sewingCap: number;
  lang?: Language;
}

export default function PipelineFlow({
  psi,
  dyeingCap,
  knittingCap,
  sewingCap,
  lang = "en",
}: PipelineFlowProps) {
  const t = translations[lang];
  const isSevere = psi < 4.0;
  const isModerate = psi >= 4.0 && psi < 8.0;

  const flowSpeed = isSevere ? "3.8s" : isModerate ? "1.9s" : "0.95s";
  const strokeColor = isSevere ? "#f43f5e" : isModerate ? "#f59e0b" : "#10b981";
  const strokeEndColor = isSevere ? "#fb7185" : isModerate ? "#fbbf24" : "#34d399";

  const stages = [
    {
      id: "boiler",
      title: "Steam Boiler",
      sub: "10-Bar Steam Gen",
      cap: Math.min(100, (psi / 4.0) * 100),
      status: isSevere ? "Low Pressure" : "Stable",
      bottleneck: isSevere,
    },
    {
      id: "dyeing",
      title: "Dyeing & Washing",
      sub: "High Thermal Demand",
      cap: dyeingCap * 100,
      status: isSevere ? "-51% Collapse" : isModerate ? "-25% Throttled" : "Nominal",
      bottleneck: isSevere,
    },
    {
      id: "knitting",
      title: "Knitting Plant",
      sub: "Yarn Preparation",
      cap: knittingCap * 100,
      status: isSevere ? "-37% Loss" : "Nominal",
      bottleneck: isSevere,
    },
    {
      id: "sewing",
      title: "Sewing & Finishing",
      sub: "UCI 73.5% Baseline",
      cap: sewingCap * 100,
      status: isSevere ? "Delayed by Dyeing" : "On Track",
      bottleneck: isSevere,
    },
  ];

  // Center coordinates aligned with 4 equal columns (12.5%, 37.5%, 62.5%, 87.5% of viewBox 1000)
  const nodeXs = [125, 375, 625, 875];

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface p-5 shadow-2xs">
      <div className="flex flex-col justify-between gap-2 border-b border-line pb-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <FactoryIcon className="h-4 w-4 text-ink-2" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">
            {t.pipelineTitle}
          </h3>
          <span className="rounded border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-ink-muted">
            {t.realtimeTelemetry}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${isSevere ? "bg-rose-500" : isModerate ? "bg-amber-500" : "bg-emerald-500"}`}
          />
          <span
            className={`font-mono text-[11px] font-medium ${
              isSevere ? "text-[var(--status-critical-text)]" : "text-ink-muted"
            }`}
          >
            {isSevere ? t.thermalBottleneck : t.fluidNormal}
          </span>
        </div>
      </div>

      {/* Desktop Connected SCADA Manifold Diagram (aligns 1:1 with lg:grid-cols-4 below) */}
      <div className="mt-4 hidden lg:block">
        <svg
          viewBox="0 0 1000 68"
          className="h-16 w-full overflow-visible"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="gaslinePipeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={strokeColor} />
              <stop offset="100%" stopColor={strokeEndColor} />
            </linearGradient>
          </defs>

          {/* Inlet Pressure Label */}
          <rect
            x="4"
            y="11"
            width="88"
            height="22"
            rx="6"
            className="fill-surface-2 stroke-line"
            strokeWidth="1"
          />
          <text
            x="48"
            y="25.5"
            textAnchor="middle"
            className="fill-ink font-mono text-[10px] font-semibold"
          >
            {psi.toFixed(1)} PSI IN
          </text>

          {/* Main Manifold Conduit */}
          <path
            d="M 96 22 H 875"
            stroke="var(--border-subtle)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M 96 22 H 875"
            stroke="url(#gaslinePipeGrad)"
            strokeWidth="5"
            strokeDasharray="16 12"
            strokeLinecap="round"
            className="scada-flow-animated"
            style={{
              animation: `flowPulse ${flowSpeed} linear infinite`,
            }}
          />

          {/* Vertical Tap Lines into Stage Cards */}
          {nodeXs.map((cx, idx) => {
            const bottleneck = stages[idx].bottleneck;
            const nodeColor = bottleneck ? "#f43f5e" : isModerate ? "#f59e0b" : "#10b981";
            return (
              <g key={cx}>
                <line
                  x1={cx}
                  y1="22"
                  x2={cx}
                  y2="64"
                  stroke={nodeColor}
                  strokeWidth="2"
                  strokeDasharray="3 3"
                  opacity="0.7"
                />
                <circle
                  cx={cx}
                  cy="22"
                  r="11"
                  fill="var(--surface-card)"
                  stroke="var(--border-strong)"
                  strokeWidth="1.5"
                />
                <circle cx={cx} cy="22" r="5.5" fill={nodeColor} />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Department Status Cards */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-0 lg:grid-cols-4">
        {stages.map((stage, idx) => (
          <div
            key={stage.id}
            className={`relative rounded-xl border border-line p-3.5 text-xs transition-colors ${
              stage.bottleneck
                ? "border-l-2 border-l-rose-500 bg-[var(--status-critical-bg)]/45"
                : "border-l-2 border-l-emerald-500/70 bg-surface-2/50"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-semibold text-ink-muted lg:hidden">
                  0{idx + 1}
                </span>
                <span className="font-semibold text-ink">{stage.title}</span>
              </div>
              {stage.bottleneck ? (
                <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0 text-[var(--status-critical-text)]" />
              ) : (
                <CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-[var(--status-safe-text)]" />
              )}
            </div>

            <span className="mt-0.5 block text-[11px] text-ink-muted">{stage.sub}</span>

            <div className="mt-2.5">
              <div className="mb-1 flex justify-between font-mono text-[10px] text-ink-muted">
                <span>Cap Factor</span>
                <strong
                  className={`font-tabular ${
                    stage.bottleneck ? "text-[var(--status-critical-text)]" : "text-ink"
                  }`}
                >
                  {stage.cap.toFixed(0)}%
                </strong>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    stage.bottleneck ? "bg-rose-500" : isModerate ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, stage.cap))}%` }}
                />
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between font-mono text-[10px]">
              <span
                className={
                  stage.bottleneck
                    ? "font-semibold text-[var(--status-critical-text)]"
                    : "text-ink-2"
                }
              >
                {stage.status}
              </span>
              {idx < stages.length - 1 && (
                <ArrowRightIcon className="h-3 w-3 text-ink-muted lg:hidden" />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
