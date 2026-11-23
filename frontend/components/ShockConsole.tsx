"use client";

import React from "react";
import { FlameIcon, RadioIcon } from "./Icons";
import { Language, translations } from "../data/translations";

interface ShockPreset {
  shock_id: number;
  event_name: string;
  zone_psi_actual: number;
  national_supply_mmcfd: number;
  source_url?: string;
}

interface ShockConsoleProps {
  shocks: ShockPreset[];
  currentPsi: number;
  currentSupply: number;
  activeShockId: number | null;
  onSelectShock: (shockId: number) => void;
  onSliderChange: (psi: number) => void;
  isSimulating: boolean;
  autoStream: boolean;
  onToggleAutoStream: () => void;
  lang?: Language;
}

export default function ShockConsole({
  shocks,
  currentPsi,
  currentSupply,
  activeShockId,
  onSelectShock,
  onSliderChange,
  isSimulating,
  autoStream,
  onToggleAutoStream,
  lang = "en",
}: ShockConsoleProps) {
  const t = translations[lang];
  const progressPct = Math.min(100, Math.max(0, ((currentPsi - 1.0) / 14.0) * 100));

  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-2xs">
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-ink">{t.shockConsoleTitle}</h2>
            <span className="rounded border border-line bg-surface-2 px-2 py-0.5 font-mono text-[10px] text-ink-muted">
              Petrobangla Pipeline Physics
            </span>
            {isSimulating && (
              <span className="rounded border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--status-info-text)]">
                Syncing
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">{t.shockConsoleDesc}</p>
        </div>

        {/* Live Grid Supply Pill & Automated IoT Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onToggleAutoStream}
            aria-pressed={autoStream}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
              autoStream
                ? "border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] text-[var(--status-critical-text)] shadow-2xs"
                : "border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-surface-2"
            }`}
          >
            <RadioIcon className={`h-3.5 w-3.5 ${autoStream ? "text-rose-500" : "text-ink-muted"}`} />
            <span>{autoStream ? "Auto-Sense IoT: STREAMING" : "Auto-Sense IoT: PAUSED"}</span>
          </button>

          <div className="font-tabular flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-1.5 font-mono text-xs">
            <span className="text-ink-muted">{t.nationalGrid}:</span>
            <span className="font-semibold text-ink">{currentSupply.toLocaleString()} mmcfd</span>
          </div>
        </div>
      </div>

      {/* Preset Scenario Selector */}
      <div className="mt-4">
        <span className="mb-2 block text-xs font-medium text-ink-2">{t.historicalPresets}:</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {shocks.map((s) => {
            const isSelected = activeShockId === s.shock_id && !autoStream;
            return (
              <button
                key={s.shock_id}
                type="button"
                onClick={() => onSelectShock(s.shock_id)}
                className={`rounded-lg border p-2.5 text-left text-xs transition-all ${
                  isSelected
                    ? "border-accent bg-accent text-accent-fg shadow-xs"
                    : "border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-surface-2/70"
                }`}
              >
                <div className="truncate font-medium">{s.event_name}</div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span
                    className={`font-tabular font-mono text-[11px] ${
                      isSelected ? "opacity-85" : "text-ink-muted"
                    }`}
                  >
                    {s.zone_psi_actual.toFixed(1)} PSI
                  </span>
                  {s.zone_psi_actual < 4.0 && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        isSelected
                          ? "bg-rose-500/25 text-rose-200"
                          : "bg-[var(--status-critical-bg)] text-[var(--status-critical-text)]"
                      }`}
                    >
                      Critical
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Zone-Calibrated Dynamic Pipeline Pressure Slider */}
      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="pipeline-psi-slider" className="flex items-center gap-2">
            <FlameIcon className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-ink">{t.dynamicPressure}:</span>
            <span className="font-tabular rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-xs font-bold text-ink">
              {currentPsi.toFixed(1)} PSI
            </span>
            {autoStream && (
              <span className="font-mono text-[10px] text-[var(--status-critical-text)]">
                [SCADA Live Feed]
              </span>
            )}
          </label>
          <span className="font-mono text-[11px] text-ink-muted">{t.nominalReq}</span>
        </div>

        <div className="relative">
          <input
            id="pipeline-psi-slider"
            type="range"
            min="1.0"
            max="15.0"
            step="0.1"
            value={currentPsi}
            aria-label={t.dynamicPressure}
            aria-valuetext={`${currentPsi.toFixed(1)} PSI`}
            onChange={(e) => onSliderChange(parseFloat(e.target.value))}
            disabled={autoStream}
            className="psi-slider"
            style={{ "--slider-progress": `${progressPct}%` } as React.CSSProperties}
          />

          {/* 4.0 PSI Boiler Minimum Threshold Marker (21.4% along 1.0 - 15.0 PSI) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[1.6rem] flex -translate-x-1/2 flex-col items-center"
            style={{ left: "21.4%" }}
          >
            <span className="h-1.5 w-px bg-ink-muted" />
            <span className="font-mono text-[9px] font-semibold text-[var(--status-critical-text)]">
              4.0 PSI Boiler Min
            </span>
          </div>
        </div>

        <div className="mt-4 flex justify-between font-mono text-[10px]">
          <span className="text-[var(--status-critical-text)]">1.0 PSI (Boiler Stall)</span>
          <span className="text-[var(--status-warning-text)]">8.0 PSI (Throttled)</span>
          <span className="text-[var(--status-safe-text)]">15.0 PSI (Full Steam)</span>
        </div>
      </div>
    </section>
  );
}
