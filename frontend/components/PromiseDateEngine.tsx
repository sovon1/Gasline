"use client";

import React, { useState } from "react";
import { AlertTriangleIcon, CheckCircleIcon, ClockIcon, Share2Icon } from "./Icons";
import { Language } from "../data/translations";
import { useToast } from "./ToastProvider";

interface PromiseDateEngineProps {
  currentPsi: number;
  dyeingCap: number;
  lang: Language;
}

export default function PromiseDateEngine({ currentPsi, dyeingCap, lang }: PromiseDateEngineProps) {
  const toast = useToast();
  const [buyer, setBuyer] = useState("Inditex (Zara)");
  const [garment, setGarment] = useState("Cotton Hoodie");
  const [quantity, setQuantity] = useState<number>(15000);
  const [quotedLeadDays, setQuotedLeadDays] = useState<number>(45);

  const garmentSpecs: Record<string, { smv: number; weightKg: number; gasInt: string; gasCode: number }> = {
    "Cotton Hoodie": { smv: 24.5, weightKg: 0.55, gasInt: "HIGH", gasCode: 2 },
    "Crewneck T-Shirt": { smv: 12.0, weightKg: 0.22, gasInt: "MEDIUM", gasCode: 1 },
    "Denim Jeans": { smv: 28.0, weightKg: 0.7, gasInt: "EXTREME", gasCode: 3 },
    "Polo Shirt": { smv: 18.0, weightKg: 0.3, gasInt: "HIGH", gasCode: 2 },
  };

  const currentSpec = garmentSpecs[garment] || garmentSpecs["Cotton Hoodie"];
  const totalWeightKg = Math.round(quantity * currentSpec.weightKg);

  const effectiveCap =
    currentSpec.gasCode >= 2 ? dyeingCap * 0.6 + 0.6 * 0.4 : dyeingCap * 0.3 + 0.6 * 0.7;
  const standardDaysNeeded = (quantity * currentSpec.smv) / (480 * 20 * 0.735);
  const projectedDays = Math.round(standardDaysNeeded / Math.max(0.2, effectiveCap));

  const conformalMargin = 2.62;
  const safeLeadTime = Math.ceil(projectedDays + conformalMargin);
  const isQuotationAtRisk = quotedLeadDays < safeLeadTime;
  const expectedDaysLate = Math.max(0, projectedDays - quotedLeadDays);

  const airFreightExposure = isQuotationAtRisk ? Math.round(totalWeightKg * 6.65) : 0;
  const dailyPenalty = buyer.includes("Zara") ? 2500 : buyer.includes("Primark") ? 3000 : 2000;
  const penaltyExposure = expectedDaysLate * dailyPenalty;
  const totalExposureUSD = airFreightExposure + penaltyExposure;

  // Comparison bar scale
  const barMax = Math.max(quotedLeadDays, safeLeadTime, projectedDays, 60) + 5;
  const quotedPct = Math.min(100, (quotedLeadDays / barMax) * 100);
  const projectedPct = Math.min(100, (projectedDays / barMax) * 100);
  const safePct = Math.min(100, (safeLeadTime / barMax) * 100);

  const handleCopyMemo = async () => {
    const memo =
      `[GasLine Merchandiser Quote Defense]\n` +
      `Buyer: ${buyer} | Order: ${quantity.toLocaleString()} pcs ${garment}\n` +
      `Target Lead Time: ${quotedLeadDays} days\n` +
      `AI Conformal Verified Safe Lead Time: ${safeLeadTime} days (95% Conf)\n` +
      `Energy Risk Status: ${isQuotationAtRisk ? "CRITICAL RISK (Late Ship Likely)" : "SAFE TO SIGN"}\n` +
      `Projected Penalty Exposure: $${totalExposureUSD.toLocaleString()} USD\n` +
      `Merchandiser Recommendation: Quote ${safeLeadTime} days or insert Force Majeure Energy Clause.`;
    await navigator.clipboard.writeText(memo);
    toast.success("Quote Defense Memo Copied", `Safe conformal quote (${safeLeadTime}d) copied to clipboard.`);
  };

  return (
    <section className="space-y-5 rounded-xl border border-line bg-surface p-5 shadow-2xs">
      {/* Title */}
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ClockIcon className="h-4 w-4 text-ink-2" />
            <h2 className="text-sm font-semibold tracking-tight text-ink">
              {lang === "en" ? "Pre-PO Promise-Date Engine" : "মার্চেন্ডাইজার লিড-টাইম ও শিপমেন্ট কোটার"}
            </h2>
            <span className="rounded border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-medium text-ink-2">
              Conformal 95% Confidence
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {lang === "en"
              ? "Validate buyer delivery dates before signing purchase contracts to eliminate uninsurable $50k air-freight penalties."
              : "বায়ারের সাথে চুক্তি সই করার আগেই এআই দিয়ে নিশ্চিত হোন গ্যাস সংকটের মাঝে এই ডেলিভারি ডেট রক্ষা করা সম্ভব কি না।"}
          </p>
        </div>
      </div>

      {/* Input Form Controls */}
      <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="quote-buyer" className="mb-1.5 block font-medium text-ink-2">
            {lang === "en" ? "Export Buyer Brand" : "বায়ার ব্র্যান্ড"}
          </label>
          <select
            id="quote-buyer"
            value={buyer}
            onChange={(e) => setBuyer(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface-2 p-2 font-medium text-ink focus:border-line-strong focus:bg-surface focus:outline-none"
          >
            <option value="Inditex (Zara)">Inditex (Zara) — $2,500/day pen</option>
            <option value="H&M">H&amp;M — $1,800/day pen</option>
            <option value="Marks & Spencer">Marks &amp; Spencer — $2,200/day pen</option>
            <option value="Primark">Primark — $3,000/day pen</option>
          </select>
        </div>

        <div>
          <label htmlFor="quote-garment" className="mb-1.5 block font-medium text-ink-2">
            {lang === "en" ? "Garment Category" : "পোশাকের ধরন"}
          </label>
          <select
            id="quote-garment"
            value={garment}
            onChange={(e) => setGarment(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface-2 p-2 font-medium text-ink focus:border-line-strong focus:bg-surface focus:outline-none"
          >
            <option value="Cotton Hoodie">Cotton Hoodie (Heavy Dyeing)</option>
            <option value="Crewneck T-Shirt">Crewneck T-Shirt (Medium Steam)</option>
            <option value="Denim Jeans">Denim Jeans (Extreme Washing)</option>
            <option value="Polo Shirt">Polo Shirt (High Dyeing)</option>
          </select>
        </div>

        <div>
          <label htmlFor="quote-quantity" className="mb-1.5 block font-medium text-ink-2">
            {lang === "en" ? "Lot Quantity (pieces)" : "অর্ডারের পরিমাণ (পিস)"}
          </label>
          <input
            id="quote-quantity"
            type="number"
            min="2000"
            max="100000"
            step="1000"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 5000)}
            className="font-tabular w-full rounded-lg border border-line bg-surface-2 p-2 font-mono font-medium text-ink focus:border-line-strong focus:bg-surface focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="quote-lead-days" className="mb-1.5 block font-medium text-ink-2">
            {lang === "en" ? "Requested Lead Time (days)" : "বায়ারের চাওয়া মেয়াদ (দিন)"}
          </label>
          <input
            id="quote-lead-days"
            type="number"
            min="20"
            max="120"
            value={quotedLeadDays}
            onChange={(e) => setQuotedLeadDays(parseInt(e.target.value, 10) || 30)}
            className="font-tabular w-full rounded-lg border border-line bg-surface-2 p-2 font-mono font-medium text-ink focus:border-line-strong focus:bg-surface focus:outline-none"
          />
        </div>
      </div>

      {/* AI Risk Verdict Card + Visual Comparison Bar */}
      <div
        className={`rounded-xl border p-4 text-xs ${
          isQuotationAtRisk
            ? "border-[var(--status-critical-border)] bg-[var(--status-critical-bg)]"
            : "border-[var(--status-safe-border)] bg-[var(--status-safe-bg)]"
        }`}
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            {isQuotationAtRisk ? (
              <AlertTriangleIcon className="h-5 w-5 shrink-0 text-[var(--status-critical-text)]" />
            ) : (
              <CheckCircleIcon className="h-5 w-5 shrink-0 text-[var(--status-safe-text)]" />
            )}
            <div>
              <span className="block text-sm font-semibold text-ink">
                {isQuotationAtRisk
                  ? lang === "en"
                    ? "Warning: High Contract Late Risk"
                    : "সতর্কতা: এই মেয়াদে অর্ডার নিলে জাহাজীকরণে বিলম্ব অনিবার্য"
                  : lang === "en"
                  ? "Safe Delivery Quotation"
                  : "নিরাপদ মেয়াদ: এই অর্ডারে কোনো বিলম্ব ঝুঁকি নেই"}
              </span>
              <span className="text-[11px] text-ink-2">
                {lang === "en"
                  ? `Under ${currentPsi.toFixed(1)} PSI throttle, conformal safe ex-factory date is ${safeLeadTime} days.`
                  : `বর্তমান ${currentPsi.toFixed(1)} পিএসআই গ্যাস প্রেশারে নিরাপদ ডেলিভারি মেয়াদ ${safeLeadTime} দিন।`}
              </span>
            </div>
          </div>

          <div className="font-tabular self-start text-right font-mono sm:self-auto">
            <span className="block text-xs text-ink-muted">Recommended Quote</span>
            <span className="text-xl font-bold text-ink">{safeLeadTime} days</span>
          </div>
        </div>

        {/* Visual Lead-Time Comparison Bar */}
        <div className="mt-4 space-y-2 rounded-lg border border-line bg-surface p-3 font-mono text-[11px]">
          <div className="flex items-center justify-between text-ink-muted">
            <span>Lead-Time Margin Comparison</span>
            <span className="font-tabular">0d — {barMax}d</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-[10px] text-ink-muted">Buyer Target</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-ink transition-all duration-300"
                  style={{ width: `${quotedPct}%` }}
                />
              </div>
              <span className="font-tabular w-12 text-right font-semibold text-ink">{quotedLeadDays}d</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-[10px] text-ink-muted">Projected Floor</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isQuotationAtRisk ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${projectedPct}%` }}
                />
              </div>
              <span className="font-tabular w-12 text-right font-semibold text-ink">{projectedDays}d</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-[10px] text-[var(--status-safe-text)]">95% Conformal</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${safePct}%` }}
                />
              </div>
              <span className="font-tabular w-12 text-right font-bold text-[var(--status-safe-text)]">
                {safeLeadTime}d
              </span>
            </div>
          </div>
        </div>

        {isQuotationAtRisk && (
          <div className="font-tabular mt-4 grid grid-cols-1 gap-3 border-t border-[var(--status-critical-border)] pt-3 font-mono sm:grid-cols-3">
            <div>
              <span className="block text-[11px] text-ink-muted">Expected Delay</span>
              <strong className="text-sm text-[var(--status-critical-text)]">
                +{expectedDaysLate} days late
              </strong>
            </div>
            <div>
              <span className="block text-[11px] text-ink-muted">Air Freight Penalty ($6.65/kg)</span>
              <strong className="text-sm text-ink">${airFreightExposure.toLocaleString()} USD</strong>
            </div>
            <div>
              <span className="block text-[11px] text-ink-muted">Total Penalty Liability</span>
              <strong className="text-sm text-[var(--status-critical-text)]">
                ${totalExposureUSD.toLocaleString()} USD
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Copy Memo Button */}
      <div className="flex items-center justify-end pt-1">
        <button
          type="button"
          onClick={handleCopyMemo}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-fg shadow-xs transition-opacity hover:opacity-90"
        >
          <Share2Icon className="h-3.5 w-3.5" />
          <span>Copy Merchandiser Quote Defense</span>
        </button>
      </div>
    </section>
  );
}
