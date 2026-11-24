"use client";

import React from "react";
import { AlertTriangleIcon, FlameIcon, RadioIcon, ShieldCheckIcon } from "./Icons";
import { Language, translations } from "../data/translations";
import { ShockUncertaintyConfig } from "./PromiseDateEngine";

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
  shockUncertainty: ShockUncertaintyConfig;
  onUpdateShockUncertainty: (next: Partial<ShockUncertaintyConfig>) => void;
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
  shockUncertainty,
  onUpdateShockUncertainty,
  lang = "en",
}: ShockConsoleProps) {
  const t = translations[lang];
  const progressPct = Math.min(100, Math.max(0, ((currentPsi - 1.0) / 14.0) * 100));
  const isUnconfirmed =
    shockUncertainty.shockMode === "unconfirmed" ||
    !shockUncertainty.durationConfirmed ||
    !shockUncertainty.zoneConfirmed;

  const toggleUnconfirmedAnnouncement = () => {
    const nextUnc = !isUnconfirmed;
    onUpdateShockUncertainty({
      shockMode: nextUnc ? "unconfirmed" : "confirmed",
      durationConfirmed: !nextUnc,
      zoneConfirmed: !nextUnc,
    });
  };

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

        {/* Live Grid Supply Pill, Unconfirmed Shock Mode & Automated IoT Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={toggleUnconfirmedAnnouncement}
            aria-pressed={isUnconfirmed}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
              isUnconfirmed
                ? "border-amber-400/70 bg-amber-400/15 text-[var(--status-warning-text)] shadow-2xs"
                : "border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-surface-2"
            }`}
          >
            {isUnconfirmed ? (
              <AlertTriangleIcon className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-500" />
            )}
            <span>
              {isUnconfirmed ? "Unconfirmed Shock: ACTIVE" : "Unconfirmed Shock Mode"}
            </span>
          </button>

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

      {/* Unconfirmed Announcement Ambiguity Controls (Duration & Zone Unknown) */}
      <fieldset className="mt-4 rounded-xl border border-line bg-surface-2/40 p-3.5 text-xs">
        <legend className="px-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Announcement Epistemic State · Duration &amp; Zone Confirmation
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-start gap-2">
            <input
              id="shock-dur-unknown"
              name="duration_unconfirmed"
              type="checkbox"
              checked={!shockUncertainty.durationConfirmed}
              onChange={(e) => {
                const durConfirmed = !e.target.checked;
                const nextUnc = !durConfirmed || !shockUncertainty.zoneConfirmed;
                onUpdateShockUncertainty({
                  durationConfirmed: durConfirmed,
                  shockMode: nextUnc ? "unconfirmed" : "confirmed",
                });
              }}
              className="mt-0.5 h-4 w-4 rounded border-line accent-amber-600"
            />
            <label htmlFor="shock-dur-unknown" className="cursor-pointer leading-snug">
              <span className="block font-semibold text-ink">No Confirmed Duration</span>
              <span className="text-[10px] text-ink-muted">
                Evaluate {shockUncertainty.durationMinDays}d quick fix vs. {shockUncertainty.durationMaxDays}d prolonged outage
              </span>
            </label>
          </div>

          <div className="flex items-start gap-2">
            <input
              id="shock-zone-unknown"
              name="zone_unconfirmed"
              type="checkbox"
              checked={!shockUncertainty.zoneConfirmed}
              onChange={(e) => {
                const znConfirmed = !e.target.checked;
                const nextUnc = !znConfirmed || !shockUncertainty.durationConfirmed;
                onUpdateShockUncertainty({
                  zoneConfirmed: znConfirmed,
                  shockMode: nextUnc ? "unconfirmed" : "confirmed",
                });
              }}
              className="mt-0.5 h-4 w-4 rounded border-line accent-amber-600"
            />
            <label htmlFor="shock-zone-unknown" className="cursor-pointer leading-snug">
              <span className="block font-semibold text-ink">No Confirmed Affected Zone</span>
              <span className="text-[10px] text-ink-muted">
                Evaluate Zone Spared (9.0 PSI), Spillover (4.3 PSI), &amp; Direct Hit
              </span>
            </label>
          </div>

          <div>
            <label htmlFor="shock-max-days" className="mb-1 flex justify-between text-[11px] font-medium text-ink-2">
              <span>Plausible Outage Span</span>
              <span className="font-tabular font-mono font-semibold text-ink">
                {shockUncertainty.durationMinDays}–{shockUncertainty.durationMaxDays}d
              </span>
            </label>
            <input
              id="shock-max-days"
              name="duration_max_days"
              type="range"
              min={6}
              max={30}
              step={3}
              disabled={shockUncertainty.durationConfirmed}
              value={shockUncertainty.durationMaxDays}
              onChange={(e) =>
                onUpdateShockUncertainty({ durationMaxDays: parseInt(e.target.value, 10) })
              }
              className="w-full accent-amber-500 disabled:opacity-40"
            />
          </div>

          <div>
            <label htmlFor="shock-zone-prior" className="mb-1 flex justify-between text-[11px] font-medium text-ink-2">
              <span>Zone Hit Prior</span>
              <span className="font-tabular font-mono font-semibold text-ink">
                {Math.round(shockUncertainty.zoneHitPrior * 100)}%
              </span>
            </label>
            <input
              id="shock-zone-prior"
              name="zone_hit_prior"
              type="range"
              min={20}
              max={85}
              step={5}
              disabled={shockUncertainty.zoneConfirmed}
              value={Math.round(shockUncertainty.zoneHitPrior * 100)}
              onChange={(e) =>
                onUpdateShockUncertainty({ zoneHitPrior: parseInt(e.target.value, 10) / 100 })
              }
              className="w-full accent-amber-500 disabled:opacity-40"
            />
          </div>
        </div>
      </fieldset>

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
            {isUnconfirmed && (
              <span className="rounded border border-amber-400/50 bg-amber-400/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--status-warning-text)]">
                Unconfirmed Envelope
              </span>
            )}
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

          {/* 4.0 PSI Boiler Minimum Threshold Marker */}
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
