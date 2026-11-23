"use client";

import React, { useState } from "react";
import { FlameIcon, ShieldCheckIcon } from "./Icons";
import { Language } from "../data/translations";

interface DieselSchedulerProps {
  currentPsi: number;
  lang: Language;
}

export default function DieselScheduler({ currentPsi, lang }: DieselSchedulerProps) {
  const [dieselPrice, setDieselPrice] = useState<number>(108);
  const [selectedHour, setSelectedHour] = useState<number>(11);

  const hours = Array.from({ length: 24 }, (_, i) => {
    let basePsi = currentPsi;
    if (i >= 23 || i < 6) {
      basePsi = currentPsi + 2.2;
    } else if (i >= 10 && i < 15) {
      basePsi = Math.max(1.0, currentPsi - 0.7);
    } else {
      basePsi = currentPsi;
    }

    const needsDiesel = basePsi < 3.5;
    const isPeakNightDyeing = i >= 23 || i < 5;

    return {
      hour: `${i.toString().padStart(2, "0")}:00`,
      hourIndex: i,
      psi: Number(basePsi.toFixed(1)),
      needsDiesel,
      mode: needsDiesel ? "DIESEL" : isPeakNightDyeing ? "NIGHT_GAS" : "GAS",
    };
  });

  const dieselHoursCount = hours.filter((h) => h.mode === "DIESEL").length;
  const boilerBurnLitersPerHour = 35;
  const numBoilers = 2;
  const hourlyBurnLiters = boilerBurnLitersPerHour * numBoilers;

  const blindCostBDT = 24 * hourlyBurnLiters * dieselPrice;
  const optimizedCostBDT = dieselHoursCount * hourlyBurnLiters * dieselPrice;
  const netSavingsBDT = blindCostBDT - optimizedCostBDT;
  const netSavingsUSD = netSavingsBDT / 120.0;

  // SVG Diurnal Chart Geometry
  const chartW = 720;
  const chartH = 165;
  const padL = 38;
  const padR = 16;
  const padT = 16;
  const padB = 26;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const yMax = Math.max(8, Math.ceil(Math.max(...hours.map((h) => h.psi)) + 1.5));
  const thresholdPsi = 3.5;

  const getX = (idx: number) => padL + (idx / 23) * plotW;
  const getY = (psiVal: number) => padT + plotH - (Math.min(yMax, Math.max(0, psiVal)) / yMax) * plotH;

  const linePoints = hours.map((h) => `${getX(h.hourIndex).toFixed(1)},${getY(h.psi).toFixed(1)}`).join(" ");
  const areaPath = `M ${getX(0).toFixed(1)},${(padT + plotH).toFixed(1)} L ${hours
    .map((h) => `${getX(h.hourIndex).toFixed(1)},${getY(h.psi).toFixed(1)}`)
    .join(" L ")} L ${getX(23).toFixed(1)},${(padT + plotH).toFixed(1)} Z`;

  const thresholdY = getY(thresholdPsi);
  const activeHour = hours[selectedHour] || hours[0];
  const activeHourCostBDT = activeHour.mode === "DIESEL" ? hourlyBurnLiters * dieselPrice : 0;
  const priceProgressPct = ((dieselPrice - 90) / (140 - 90)) * 100;

  return (
    <section className="space-y-5 rounded-xl border border-line bg-surface p-5 shadow-2xs">
      {/* Module Title */}
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <FlameIcon className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold tracking-tight text-ink">
              {lang === "en" ? "Smart Diesel Boiler Dispatch Engine" : "স্মার্ট ডিজেল বয়লার ডিসপ্যাচ শিডিউলার"}
            </h2>
            <span className="rounded border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--status-safe-text)]">
              Fuel AI Optimizer
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {lang === "en"
              ? "Replaces blind 24/7 diesel burn with synchronized diurnal peak-injection, slashing generator fuel costs by up to 75%."
              : "দিন-রাত অন্ধভাবে ডিজেল জেনারেটর না চালিয়ে ঠিক কোন কোন পিক ঘণ্টায় ডিজেল ইনজেকশন দিতে হবে তা নির্ধারণ করে ৭৫% পর্যন্ত জ্বালানি খরচ সাশ্রয় করুন।"}
          </p>
        </div>

        {/* Diesel Price Slider */}
        <div className="flex items-center gap-3 self-start rounded-xl border border-line bg-surface-2 px-3 py-1.5 font-mono text-xs sm:self-auto">
          <label htmlFor="diesel-price-slider" className="text-ink-muted">
            Diesel:
          </label>
          <span className="font-tabular font-bold text-ink">৳{dieselPrice}/L</span>
          <input
            id="diesel-price-slider"
            type="range"
            min="90"
            max="140"
            value={dieselPrice}
            aria-label="Diesel Price BDT per liter"
            onChange={(e) => setDieselPrice(parseInt(e.target.value, 10))}
            className="range-slider w-24"
            style={{ "--slider-progress": `${priceProgressPct}%` } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Financial Savings Banner */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface-2/60 p-3.5">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-muted">
            {lang === "en" ? "Blind 24-Hour Diesel Burn" : "২৪ ঘণ্টা টানা ডিজেল চালানোর খরচ"}
          </span>
          <span className="font-tabular mt-1 block font-mono text-lg font-bold text-ink">
            ৳{blindCostBDT.toLocaleString()}
          </span>
          <span className="font-tabular font-mono text-[10px] text-ink-muted">
            ≈ ${(blindCostBDT / 120).toFixed(0)} USD / day
          </span>
        </div>

        <div className="rounded-xl border border-line bg-surface-2/60 p-3.5">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-muted">
            {lang === "en" ? "GasLine Optimized Dispatch" : "গ্যাসলাইন স্মার্ট শিডিউলের খরচ"}
          </span>
          <span className="font-tabular mt-1 block font-mono text-lg font-bold text-[var(--status-safe-text)]">
            ৳{optimizedCostBDT.toLocaleString()}
          </span>
          <span className="font-tabular font-mono text-[10px] text-ink-muted">
            {dieselHoursCount} hrs diesel burn only
          </span>
        </div>

        <div className="rounded-xl border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] p-3.5">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--status-safe-text)]">
            {lang === "en" ? "Daily Net Factory Fuel Savings" : "দৈনিক নিট জ্বালানি সাশ্রয়"}
          </span>
          <span className="font-tabular mt-1 block font-mono text-lg font-bold text-[var(--status-safe-text)]">
            ৳{netSavingsBDT.toLocaleString()}
          </span>
          <span className="font-tabular font-mono text-[10px] font-medium text-[var(--status-safe-text)]">
            +${netSavingsUSD.toFixed(0)} USD saved daily
          </span>
        </div>
      </div>

      {/* Interactive 24-Hour Diurnal Curve + Scrubber */}
      <div className="space-y-3 rounded-xl border border-line bg-surface-2/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink">
            {lang === "en"
              ? "24-Hour Diurnal Pressure Curve & Fuel Dispatch (00:00 – 23:00)"
              : "২৪ ঘণ্টার গ্যাস প্রেশার কার্ভ ও অপ্টিমাল ফুয়েল শিডিউল"}
          </span>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-ink-2">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" />
              <span>Diesel Boost ({dieselHoursCount}h)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
              <span>Pipeline Gas ({24 - dieselHoursCount}h)</span>
            </span>
          </div>
        </div>

        {/* SVG Diurnal Curve */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="h-44 min-w-[540px] w-full select-none"
            role="img"
            aria-label="24-hour diurnal gas pressure curve with 3.5 PSI diesel ignition threshold"
          >
            <defs>
              <linearGradient id="diurnalAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Horizontal reference grid */}
            {[0, Math.round(yMax / 2), yMax].map((tick) => {
              const y = getY(tick);
              return (
                <g key={tick}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={chartW - padR}
                    y2={y}
                    stroke="var(--border-subtle)"
                    strokeWidth="1"
                  />
                  <text
                    x={padL - 8}
                    y={y + 3}
                    textAnchor="end"
                    fill="var(--text-muted)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Diesel Burn Zone Shading below 3.5 PSI */}
            <rect
              x={padL}
              y={thresholdY}
              width={plotW}
              height={padT + plotH - thresholdY}
              fill="#f43f5e"
              opacity="0.07"
            />

            {/* 3.5 PSI Ignition Threshold Line */}
            <line
              x1={padL}
              y1={thresholdY}
              x2={chartW - padR}
              y2={thresholdY}
              stroke="#f43f5e"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            <text
              x={chartW - padR - 4}
              y={thresholdY - 5}
              textAnchor="end"
              fill="var(--status-critical-text)"
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
            >
              3.5 PSI Diesel Threshold
            </text>

            {/* Area & Line */}
            <path d={areaPath} fill="url(#diurnalAreaGrad)" />
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2.25"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={linePoints}
            />

            {/* Selected vertical cursor */}
            <line
              x1={getX(selectedHour)}
              y1={padT}
              x2={getX(selectedHour)}
              y2={padT + plotH}
              stroke="var(--text-primary)"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.5"
            />

            {/* Hourly interactive markers & X-axis labels */}
            {hours.map((h) => {
              const cx = getX(h.hourIndex);
              const cy = getY(h.psi);
              const isSelected = h.hourIndex === selectedHour;
              const dotColor = h.mode === "DIESEL" ? "#f43f5e" : "#10b981";
              return (
                <g key={h.hourIndex}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isSelected ? 5.5 : 3}
                    fill={dotColor}
                    stroke="var(--surface-card)"
                    strokeWidth={isSelected ? 2 : 1.2}
                    className="cursor-pointer transition-all"
                    onClick={() => setSelectedHour(h.hourIndex)}
                  />
                  {h.hourIndex % 3 === 0 && (
                    <text
                      x={cx}
                      y={chartH - 6}
                      textAnchor="middle"
                      fill="var(--text-muted)"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {h.hour}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* 24-Segment Interactive Timeline Scrubber */}
        <div
          role="group"
          aria-label="Select hour to inspect fuel dispatch"
          className="grid grid-cols-12 gap-1 sm:grid-cols-[repeat(24,minmax(0,1fr))]"
        >
          {hours.map((h) => {
            const isSelected = h.hourIndex === selectedHour;
            const isDiesel = h.mode === "DIESEL";
            const isNight = h.mode === "NIGHT_GAS";
            return (
              <button
                key={h.hourIndex}
                type="button"
                onClick={() => setSelectedHour(h.hourIndex)}
                onMouseEnter={() => setSelectedHour(h.hourIndex)}
                aria-pressed={isSelected}
                title={`${h.hour} — ${h.psi} PSI (${h.mode})`}
                className={`flex flex-col items-center rounded-md border py-1.5 font-mono text-[10px] transition-all ${
                  isSelected
                    ? "border-ink bg-accent text-accent-fg shadow-xs"
                    : isDiesel
                    ? "border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] text-[var(--status-critical-text)] hover:opacity-85"
                    : isNight
                    ? "border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] text-[var(--status-safe-text)] hover:opacity-85"
                    : "border-line bg-surface text-ink-2 hover:border-line-strong"
                }`}
              >
                <span className="font-tabular leading-none">{h.hourIndex.toString().padStart(2, "0")}</span>
                <span
                  className={`mt-1 h-1.5 w-1.5 rounded-full ${
                    isSelected
                      ? "bg-current"
                      : isDiesel
                      ? "bg-rose-500"
                      : isNight
                      ? "bg-emerald-500"
                      : "bg-ink-muted/50"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Selected Hour Telemetry Readout */}
        <div className="font-tabular grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface p-3 font-mono text-xs sm:grid-cols-4">
          <div>
            <span className="block text-[10px] uppercase text-ink-muted">Selected Window</span>
            <strong className="text-ink">{activeHour.hour} – {((activeHour.hourIndex + 1) % 24).toString().padStart(2, "0")}:00</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-ink-muted">Forecast Manifold</span>
            <strong className={activeHour.needsDiesel ? "text-[var(--status-critical-text)]" : "text-[var(--status-safe-text)]"}>
              {activeHour.psi.toFixed(1)} PSI
            </strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-ink-muted">Active Fuel Mode</span>
            <strong className="text-ink">
              {activeHour.mode === "DIESEL"
                ? "Diesel Boost (70 L/hr)"
                : activeHour.mode === "NIGHT_GAS"
                ? "Night Gas Dyeing"
                : "Standard Pipeline Gas"}
            </strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-ink-muted">Hourly Fuel Cost</span>
            <strong className="text-ink">
              ৳{activeHourCostBDT.toLocaleString()} (${(activeHourCostBDT / 120).toFixed(1)})
            </strong>
          </div>
        </div>
      </div>

      {/* Operational Dispatch Instruction */}
      <div className="space-y-1 rounded-xl border border-line bg-surface-2/60 p-3.5 text-xs text-ink-2">
        <div className="flex items-center gap-1.5 font-semibold text-ink">
          <ShieldCheckIcon className="h-4 w-4 text-[var(--status-safe-text)]" />
          <span>{lang === "en" ? "Shift In-Charge Protocol" : "শিফট ইন-চার্জ নির্দেশিকা"}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-ink-2">
          {lang === "en"
            ? `Boilers 1 & 2 should ignite diesel boost precisely during the peak starvation window (10:00 to 14:00) when grid transmission dips below 3.5 PSI. Run heavy dyeing lots during the night off-peak window (23:00 to 05:00) when pressure naturally recovers to ${Math.min(
                12,
                currentPsi + 2.2
              ).toFixed(1)} PSI.`
            : `গ্রিডের প্রেশার ৩.৫ পিএসআই-এর নিচে নামলে সকাল ১০:০০ থেকে দুপুর ২:০০ পর্যন্ত বয়লারে ডিজেল বুস্ট চালু করুন। রাত ১১:০০ থেকে ভোর ৫:০০ পর্যন্ত পাইপলাইনে প্রেশার স্বাভাবিকভাবে বেড়ে ${(
                currentPsi + 2.2
              ).toFixed(1)} পিএসআই হবে, তাই ভারী ডাইং কাজগুলো রাতে সম্পন্ন করুন।`}
        </p>
      </div>
    </section>
  );
}
