"use client";

import React, { useEffect, useRef, useState } from "react";
import { CLUSTERS, ClusterOption } from "../data/clusters";
import { Language, translations } from "../data/translations";
import {
  getResolvedTheme,
  ResolvedTheme,
  subscribeThemeChanges,
  toggleThemeTwoState,
} from "../utils/theme";
import {
  ActivityIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  CommandIcon,
  FactoryIcon,
  FlameIcon,
  MoonIcon,
  ScanLineIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SunIcon,
  Volume2Icon,
  VolumeXIcon,
  ZapIcon,
} from "./Icons";

interface HeaderProps {
  backendOnline: boolean;
  accuracy: number;
  conformalMargin: number;
  activeCluster: ClusterOption;
  onSelectCluster: (cluster: ClusterOption) => void;
  lang: Language;
  onToggleLang: (newLang: Language) => void;
  onOpenQuotePromise?: () => void;
  onRunJudgeDemo?: () => void;
  onOpenCopilot?: () => void;
  onOpenVisionScan?: () => void;
  onOpenCommandPalette?: () => void;
  audioEnabled?: boolean;
  onToggleAudio?: () => void;
}

function useAnchoredPopoverFallback(
  triggerRef: React.RefObject<HTMLButtonElement | null>,
  popoverRef: React.RefObject<HTMLDivElement | null>,
  align: "start" | "end"
) {
  useEffect(() => {
    const popover = popoverRef.current;
    const trigger = triggerRef.current;
    if (!popover || !trigger) return;
    if (typeof window === "undefined" || window.CSS?.supports?.("position-area: block-end")) return;

    const handleBeforeToggle = (e: Event) => {
      const toggleEvent = e as Event & { newState?: string };
      if (toggleEvent.newState !== "open") return;
      const rect = trigger.getBoundingClientRect();
      const popWidth = popover.offsetWidth || 300;
      const top = Math.min(window.innerHeight - 280, rect.bottom + 8);
      const left =
        align === "start"
          ? Math.max(8, Math.min(rect.left, window.innerWidth - popWidth - 8))
          : Math.max(8, Math.min(rect.right - popWidth, window.innerWidth - popWidth - 8));
      popover.style.position = "fixed";
      popover.style.inset = "auto";
      popover.style.margin = "0";
      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
    };

    popover.addEventListener("beforetoggle", handleBeforeToggle);
    return () => popover.removeEventListener("beforetoggle", handleBeforeToggle);
  }, [triggerRef, popoverRef, align]);
}

export default function Header({
  backendOnline,
  accuracy,
  conformalMargin,
  activeCluster,
  onSelectCluster,
  lang,
  onToggleLang,
  onOpenQuotePromise,
  onRunJudgeDemo,
  onOpenCopilot,
  onOpenVisionScan,
  onOpenCommandPalette,
  audioEnabled = true,
  onToggleAudio,
}: HeaderProps) {
  const clusterBtnRef = useRef<HTMLButtonElement>(null);
  const clusterPopoverRef = useRef<HTMLDivElement>(null);
  const telemetryBtnRef = useRef<HTMLButtonElement>(null);
  const telemetryPopoverRef = useRef<HTMLDivElement>(null);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const t = translations[lang];

  useEffect(() => {
    setResolvedTheme(getResolvedTheme());
    return subscribeThemeChanges(() => {
      setResolvedTheme(getResolvedTheme());
    });
  }, []);

  useAnchoredPopoverFallback(clusterBtnRef, clusterPopoverRef, "start");
  useAnchoredPopoverFallback(telemetryBtnRef, telemetryPopoverRef, "end");

  const handleClusterPick = (cluster: ClusterOption) => {
    onSelectCluster(cluster);
    const pop = clusterPopoverRef.current as (HTMLDivElement & { hidePopover?: () => void }) | null;
    pop?.hidePopover?.();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[var(--surface-glass)] backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-2">
          {/* Left: Brand Identity & Anchored Cluster Switcher */}
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-xs">
              <FlameIcon className="h-4 w-4 text-amber-400" />
            </div>

            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <span className="whitespace-nowrap text-sm font-semibold tracking-tight text-ink">
                GasLine
              </span>
              <span className="hidden whitespace-nowrap rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-ink-muted xl:inline-block">
                {t.brandSubtitle}
              </span>
            </div>

            {/* Interactive Cluster Switcher (Visible on all viewports without collapsing) */}
            <button
              ref={clusterBtnRef}
              type="button"
              {...({ popoverTarget: "cluster-switcher-popover" } as Record<string, string>)}
              aria-label={`Plant Cluster: ${activeCluster.name}`}
              className="flex h-8 min-w-0 max-w-[165px] items-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-xs text-ink-2 shadow-2xs transition-all hover:border-line-strong hover:bg-surface-2 active:scale-[0.98] sm:max-w-none sm:gap-2 sm:px-2.5"
            >
              <FactoryIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
              <span className="min-w-0 truncate font-medium text-ink sm:max-w-[180px] xl:max-w-[250px]">
                {activeCluster.name}
              </span>
              <span className="hidden shrink-0 whitespace-nowrap rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-2 md:inline">
                {activeCluster.defaultPsi} PSI
              </span>
              <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
            </button>

            <div
              id="cluster-switcher-popover"
              ref={clusterPopoverRef}
              {...({ popover: "auto" } as Record<string, string>)}
              className="gasline-popover gasline-popover--start w-80 p-2"
            >
              <div className="mb-1.5 flex items-center justify-between border-b border-line px-2 py-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Industrial Export Clusters
                </span>
                <span className="font-mono text-[10px] text-ink-muted">4 Zones</span>
              </div>
              <div className="space-y-1">
                {CLUSTERS.map((c) => {
                  const isSelected = c.id === activeCluster.id;
                  const severityBadge =
                    c.severity === "CRITICAL"
                      ? "bg-[var(--status-critical-bg)] text-[var(--status-critical-text)] border-[var(--status-critical-border)]"
                      : c.severity === "MODERATE"
                      ? "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]"
                      : "bg-[var(--status-safe-bg)] text-[var(--status-safe-text)] border-[var(--status-safe-border)]";

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleClusterPick(c)}
                      className={`flex w-full flex-col rounded-lg p-2.5 text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-accent text-accent-fg shadow-xs"
                          : "text-ink hover:bg-surface-2"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-semibold">
                          {isSelected && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
                          <span>{c.name}</span>
                        </span>
                        <span
                          className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                            isSelected ? "border-white/20 bg-white/10 text-current" : severityBadge
                          }`}
                        >
                          ~{c.defaultPsi} PSI
                        </span>
                      </div>
                      <span
                        className={`mt-0.5 truncate text-[11px] ${
                          isSelected ? "opacity-80" : "text-ink-muted"
                        }`}
                      >
                        {c.plantName} • {c.location}
                      </span>
                      <span
                        className={`mt-1 font-mono text-[10px] ${
                          isSelected ? "opacity-70" : "text-ink-muted"
                        }`}
                      >
                        {c.gridProvider}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Streamlined Operational Controls */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                title="Open Command Palette (Ctrl/Cmd + K)"
                aria-label="Open Command Palette"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-xs text-ink-muted transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink lg:px-2.5"
              >
                <CommandIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden whitespace-nowrap lg:inline">Search</span>
                <kbd className="hidden rounded border border-line bg-surface-2 px-1 py-0.5 font-mono text-[10px] text-ink-2 lg:inline">
                  ⌘K
                </kbd>
              </button>
            )}

            {onOpenQuotePromise && (
              <button
                type="button"
                onClick={onOpenQuotePromise}
                title="Promise Ship Date at Quotation Time (Before Accepting PO)"
                aria-label="Open Quote Promise Engine"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-2 text-xs font-semibold text-[var(--status-safe-text)] transition-all hover:bg-emerald-500/25 active:scale-[0.97] sm:px-2.5"
              >
                <ClockIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden whitespace-nowrap sm:inline">Quote PO</span>
              </button>
            )}

            {onOpenVisionScan && (
              <button
                type="button"
                onClick={onOpenVisionScan}
                title="Scan Physical Line Whiteboard or Fabric Lot Ticket"
                aria-label="Scan Line Board"
                className="hidden h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-medium text-ink transition-all hover:border-line-strong hover:bg-surface-2 active:scale-[0.97] sm:flex"
              >
                <ScanLineIcon className="h-3.5 w-3.5 shrink-0 text-ink-2" />
                <span className="hidden whitespace-nowrap md:inline">Scan</span>
              </button>
            )}

            {onOpenCopilot && (
              <button
                type="button"
                onClick={onOpenCopilot}
                title="Open Autonomous Bilingual ReAct Copilot"
                aria-label="Open AI Copilot"
                className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-emerald-500 active:scale-[0.97] sm:px-2.5"
              >
                <SparklesIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden whitespace-nowrap sm:inline">AI Copilot</span>
              </button>
            )}

            {onRunJudgeDemo && (
              <button
                type="button"
                onClick={onRunJudgeDemo}
                title="Simulate 1.6 PSI LNG Crisis & Launch Top Rescue"
                aria-label="Trigger Crisis Demo"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-amber-400/50 bg-amber-400/15 px-2 text-xs font-semibold text-[var(--status-warning-text)] transition-all hover:bg-amber-400/25 active:scale-[0.97] sm:px-2.5"
              >
                <ZapIcon className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span className="hidden whitespace-nowrap sm:inline">Crisis Demo</span>
              </button>
            )}

            {/* Bilingual Language Segmented Pill */}
            <div
              role="group"
              aria-label="Language Switcher"
              className="flex h-8 shrink-0 items-center rounded-lg border border-line bg-surface-2 p-0.5 font-mono text-[11px]"
            >
              <button
                type="button"
                onClick={() => onToggleLang("en")}
                aria-pressed={lang === "en"}
                className={`rounded-md px-1.5 py-1 font-semibold transition-colors sm:px-2 ${
                  lang === "en" ? "bg-surface text-ink shadow-2xs" : "text-ink-muted hover:text-ink"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => onToggleLang("bn")}
                aria-pressed={lang === "bn"}
                className={`rounded-md px-1.5 py-1 font-semibold transition-colors sm:px-2 ${
                  lang === "bn" ? "bg-surface text-ink shadow-2xs" : "text-ink-muted hover:text-ink"
                }`}
              >
                বাং
              </button>
            </div>

            {/* Audio Mute Toggle */}
            {onToggleAudio && (
              <button
                type="button"
                onClick={onToggleAudio}
                title={audioEnabled ? "Mute SCADA alert chimes" : "Unmute SCADA alert chimes"}
                aria-label={audioEnabled ? "Mute SCADA alert chimes" : "Unmute SCADA alert chimes"}
                aria-pressed={!audioEnabled}
                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink md:flex"
              >
                {audioEnabled ? <Volume2Icon className="h-3.5 w-3.5" /> : <VolumeXIcon className="h-3.5 w-3.5 text-ink-muted" />}
              </button>
            )}

            {/* Light / Dark Theme Toggle */}
            <button
              type="button"
              onClick={() => setResolvedTheme(toggleThemeTwoState())}
              title={resolvedTheme === "dark" ? "Switch to Daylight Precision theme" : "Switch to SCADA Dark theme"}
              aria-label={resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink"
            >
              {resolvedTheme === "dark" ? <SunIcon className="h-3.5 w-3.5 text-amber-400" /> : <MoonIcon className="h-3.5 w-3.5" />}
            </button>

            {/* Telemetry & Model Health Popover Trigger */}
            <button
              ref={telemetryBtnRef}
              type="button"
              {...({ popoverTarget: "telemetry-status-popover" } as Record<string, string>)}
              title="System Telemetry & Model Accuracy"
              aria-label="System Telemetry & Model Accuracy"
              className="hidden h-8 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 font-mono text-[11px] text-ink-2 transition-colors hover:border-line-strong hover:bg-surface-2 sm:flex"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  backendOnline ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <span className="hidden whitespace-nowrap xl:inline">{backendOnline ? t.apiLive : "Edge Sim"}</span>
            </button>

            <div
              id="telemetry-status-popover"
              ref={telemetryPopoverRef}
              {...({ popover: "auto" } as Record<string, string>)}
              className="gasline-popover w-72 p-3 text-xs"
            >
              <div className="flex items-center justify-between border-b border-line pb-2">
                <div className="flex items-center gap-2 font-semibold text-ink">
                  <ActivityIcon className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Engine Telemetry</span>
                </div>
                <span
                  className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                    backendOnline
                      ? "border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] text-[var(--status-safe-text)]"
                      : "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
                  }`}
                >
                  {backendOnline ? "API :8000 LIVE" : "CLIENT FALLBACK"}
                </span>
              </div>

              <div className="mt-2.5 space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-ink-muted">
                    <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                    <span>{t.aiEngine} Accuracy</span>
                  </span>
                  <strong className="font-tabular text-ink">{(accuracy * 100).toFixed(2)}%</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Conformal Bound (90%)</span>
                  <strong className="font-tabular text-ink">±{conformalMargin} days</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted">Active Grid</span>
                  <span className="truncate pl-3 text-right text-ink-2">{activeCluster.gridProvider}</span>
                </div>
                <div className="border-t border-line pt-2 font-sans text-[10px] text-ink-muted">
                  Data: Simulated factory (BKMEA/UCI/Petrobangla)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
