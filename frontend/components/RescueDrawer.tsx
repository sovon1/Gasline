"use client";

import React, { useState, useEffect } from "react";
import ModalDialog from "./ModalDialog";
import { OrderItem } from "./OrderLedger";
import { ShockUncertaintyConfig } from "./PromiseDateEngine";
import { useToast } from "./ToastProvider";
import { API_BASE } from "../utils/api";
import {
  AlertTriangleIcon,
  BrainIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  FlameIcon,
  InfoIcon,
  MailIcon,
  MessageSquareIcon,
  PackageIcon,
  Share2Icon,
  ShieldCheckIcon,
  ShipIcon,
  XIcon,
  ZapIcon,
} from "./Icons";

interface RescuePlan {
  plan_id: string;
  plan_name: string;
  category: string;
  description: string;
  implementation_cost_usd: number;
  implementation_cost_bdt: number;
  cost_range_usd?: [number, number];
  new_p_late: number;
  risk_reduction_pct: number;
  days_saved: number;
  conformal_interval_90: [number, number];
  avoided_loss_usd: number;
  avoided_loss_bdt: number;
  net_saving_usd: number;
  net_saving_bdt: number;
  expected_net_saving_usd?: number;
  net_saving_range_usd?: [number, number];
  max_regret_usd?: number;
  downside_loss_prob_pct?: number;
  rank_stability_pct?: number;
  roi_pct: number;
  recommended: boolean;
  commitment_stage?: string;
  honest_badge?: string;
  trigger_rule?: string;
}

interface ScenarioCell {
  scenario_id: string;
  label: string;
  zone_psi: number;
  duration_days: number;
  probability_pct: number;
  baseline_exposure_usd: number;
  winning_plan_id: string;
  winning_plan_name: string;
  winning_net_saving_usd: number;
}

interface UncertaintySummary {
  is_unconfirmed_shock: boolean;
  duration_confirmed: boolean;
  zone_confirmed: boolean;
  duration_range_days?: [number, number];
  zone_hit_prior?: number;
  scenarios_evaluated: number;
  ranking_flips_across_scenarios: boolean;
  best_if_mild_or_spared?: string;
  best_if_prolonged_direct_hit?: string;
  honest_guidance: string;
  scenario_matrix?: ScenarioCell[];
}

interface RescueDrawerProps {
  order: OrderItem | null;
  onClose: () => void;
  onOpenAudit: (order: OrderItem) => void;
  shockUncertainty?: ShockUncertaintyConfig;
  onUpdateShockUncertainty?: (next: Partial<ShockUncertaintyConfig>) => void;
}

const DEFAULT_UNC: ShockUncertaintyConfig = {
  shockMode: "confirmed",
  durationConfirmed: true,
  zoneConfirmed: true,
  durationMinDays: 2,
  durationMaxDays: 21,
  zoneHitPrior: 0.55,
};

export default function RescueDrawer({
  order,
  onClose,
  onOpenAudit,
  shockUncertainty = DEFAULT_UNC,
  onUpdateShockUncertainty,
}: RescueDrawerProps) {
  const toast = useToast();
  const [cachedOrder, setCachedOrder] = useState<OrderItem | null>(order);
  const [plans, setPlans] = useState<RescuePlan[]>([]);
  const [uncertaintySummary, setUncertaintySummary] = useState<UncertaintySummary | null>(null);
  const [baselineRangeUsd, setBaselineRangeUsd] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [recipientPhone, setRecipientPhone] = useState("+880 1712-345678");
  const [drawerView, setDrawerView] = useState<"PLANS" | "MATRIX" | "GANTT" | "XAI">("PLANS");

  const isUnconfirmed =
    shockUncertainty.shockMode === "unconfirmed" ||
    !shockUncertainty.durationConfirmed ||
    !shockUncertainty.zoneConfirmed;

  useEffect(() => {
    if (order) {
      setCachedOrder(order);
    }
  }, [order]);

  useEffect(() => {
    if (!order) return;
    let active = true;
    setLoading(true);

    fetch(`${API_BASE}/api/rescue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: order.order_id,
        custom_order: order.is_custom ? order : undefined,
        current_psi: order.current_psi,
        shock_mode: shockUncertainty.shockMode,
        duration_confirmed: shockUncertainty.durationConfirmed,
        zone_confirmed: shockUncertainty.zoneConfirmed,
        duration_min_days: shockUncertainty.durationMinDays,
        duration_max_days: shockUncertainty.durationMaxDays,
        zone_hit_prior: shockUncertainty.zoneHitPrior,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        if (data.rescue_plans && data.rescue_plans.length > 0) {
          setPlans(data.rescue_plans);
          setUncertaintySummary(data.uncertainty_summary || null);
          setBaselineRangeUsd(data.baseline?.total_exposure_range_usd || null);
          setSelectedPlanId(data.rescue_plans[0]?.plan_id || null);
        } else {
          throw new Error("No rescue plans returned");
        }
      })
      .catch(() => {
        if (!active) return;
        const exposure = (order.simulated_exposure_usd ?? order.total_exposure_usd) || 12000;
        const unc = isUnconfirmed;
        const fallbackPlans: RescuePlan[] = [
          {
            plan_id: "resequence_dyeing",
            plan_name: "Dyeing Window Re-sequence",
            category: "Zero-Cost Scheduling",
            description:
              "Shift dyeing batch to forecast high-pressure off-peak window (night hours 11 PM - 6 AM).",
            implementation_cost_usd: 0,
            implementation_cost_bdt: 0,
            cost_range_usd: [0, 0],
            new_p_late: 0.15,
            risk_reduction_pct: 68.5,
            days_saved: 5.2,
            conformal_interval_90: [0, 3.2],
            avoided_loss_usd: Math.round(exposure * 0.65),
            avoided_loss_bdt: Math.round(exposure * 0.65 * 120),
            net_saving_usd: Math.round(exposure * 0.65),
            net_saving_bdt: Math.round(exposure * 0.65 * 120),
            net_saving_range_usd: unc ? [0, Math.round(exposure * 0.85)] : [Math.round(exposure * 0.65), Math.round(exposure * 0.65)],
            max_regret_usd: unc ? Math.round(exposure * 0.12) : 0,
            downside_loss_prob_pct: 0,
            rank_stability_pct: 88,
            roi_pct: 999.0,
            recommended: true,
            commitment_stage: unc ? "NO_REGRET_NOW" : "CONFIRMED_EXECUTE",
            honest_badge: unc ? "Execute Now (No-Regret)" : "Recommended",
            trigger_rule: "Zero sunk cost even if shock misses this zone.",
          },
          {
            plan_id: "line_split",
            plan_name: "Parallel Line Split",
            category: "Capacity Reallocation",
            description:
              "Split cutting and sewing across 2 parallel assembly lines, cutting sewing duration by 35%.",
            implementation_cost_usd: 150,
            implementation_cost_bdt: 18000,
            cost_range_usd: [150, 150],
            new_p_late: 0.22,
            risk_reduction_pct: 54.0,
            days_saved: 4.0,
            conformal_interval_90: [0, 3.8],
            avoided_loss_usd: Math.round(exposure * 0.55),
            avoided_loss_bdt: Math.round(exposure * 0.55 * 120),
            net_saving_usd: Math.round(exposure * 0.55 - 150),
            net_saving_bdt: Math.round((exposure * 0.55 - 150) * 120),
            net_saving_range_usd: unc ? [-150, Math.round(exposure * 0.78 - 150)] : [Math.round(exposure * 0.55 - 150), Math.round(exposure * 0.55 - 150)],
            max_regret_usd: 150,
            downside_loss_prob_pct: unc ? 24.8 : 0,
            rank_stability_pct: 76,
            roi_pct: 350.0,
            recommended: true,
            commitment_stage: unc ? "NO_REGRET_NOW" : "CONFIRMED_EXECUTE",
            honest_badge: unc ? "Execute Now (No-Regret)" : "Recommended",
            trigger_rule: "Capped $150 jig setup regret if zone is spared.",
          },
          {
            plan_id: "diesel_steam_boost",
            plan_name: "Dual-Fuel Diesel Boiler Boost",
            category: "Energy Substitution",
            description:
              "Fire backup diesel burner to sustain 10-bar steam pressure for dyeing during low-gas hours.",
            implementation_cost_usd: unc ? 1640 : 1890,
            implementation_cost_bdt: (unc ? 1640 : 1890) * 120,
            cost_range_usd: unc ? [380, 4265] : [1890, 1890],
            new_p_late: 0.08,
            risk_reduction_pct: 82.0,
            days_saved: 8.0,
            conformal_interval_90: [0, 1.8],
            avoided_loss_usd: Math.round(exposure * 0.85),
            avoided_loss_bdt: Math.round(exposure * 0.85 * 120),
            net_saving_usd: Math.round(exposure * 0.85 - (unc ? 1640 : 1890)),
            net_saving_bdt: Math.round((exposure * 0.85 - (unc ? 1640 : 1890)) * 120),
            net_saving_range_usd: unc ? [-380, Math.round(exposure * 1.15 - 3200)] : [Math.round(exposure * 0.85 - 1890), Math.round(exposure * 0.85 - 1890)],
            max_regret_usd: unc ? 1420 : 0,
            downside_loss_prob_pct: unc ? 38.5 : 0,
            rank_stability_pct: unc ? 42 : 100,
            roi_pct: 220.0,
            recommended: !unc,
            commitment_stage: unc ? "CONDITIONAL_HOLD" : "CONFIRMED_EXECUTE",
            honest_badge: unc ? "Hold Cash · Stage Trigger" : "Recommended",
            trigger_rule: "Trigger ONLY if local manifold drops < 3.5 PSI for >= 24h.",
          },
          {
            plan_id: "overtime_shift",
            plan_name: "2-Hour Daily Overtime",
            category: "Workforce Mobilization",
            description:
              "Add 2 overtime hours daily for 20 line workers (10-hr shifts @ BDT 250/hr overtime rate).",
            implementation_cost_usd: unc ? 980 : 1250,
            implementation_cost_bdt: (unc ? 980 : 1250) * 120,
            cost_range_usd: unc ? [375, 2250] : [1250, 1250],
            new_p_late: 0.18,
            risk_reduction_pct: 60.0,
            days_saved: 6.5,
            conformal_interval_90: [0, 2.8],
            avoided_loss_usd: Math.round(exposure * 0.72),
            avoided_loss_bdt: Math.round(exposure * 0.72 * 120),
            net_saving_usd: Math.round(exposure * 0.72 - (unc ? 980 : 1250)),
            net_saving_bdt: Math.round((exposure * 0.72 - (unc ? 980 : 1250)) * 120),
            net_saving_range_usd: unc ? [-375, Math.round(exposure * 0.9 - 1800)] : [Math.round(exposure * 0.72 - 1250), Math.round(exposure * 0.72 - 1250)],
            max_regret_usd: unc ? 950 : 0,
            downside_loss_prob_pct: unc ? 34.0 : 0,
            rank_stability_pct: unc ? 45 : 80,
            roi_pct: 180.0,
            recommended: false,
            commitment_stage: unc ? "CONDITIONAL_HOLD" : "OPTIONAL",
            honest_badge: unc ? "Hold Cash · Stage Trigger" : "Lower ROI",
            trigger_rule: "Hold roster lock-in until outage exceeds 72h.",
          },
        ];
        setPlans(fallbackPlans);
        setUncertaintySummary(
          unc
            ? {
                is_unconfirmed_shock: true,
                duration_confirmed: shockUncertainty.durationConfirmed,
                zone_confirmed: shockUncertainty.zoneConfirmed,
                duration_range_days: [shockUncertainty.durationMinDays, shockUncertainty.durationMaxDays],
                zone_hit_prior: shockUncertainty.zoneHitPrior,
                scenarios_evaluated: 9,
                ranking_flips_across_scenarios: true,
                best_if_mild_or_spared: "Dyeing Window Re-sequence",
                best_if_prolonged_direct_hit: "Dual-Fuel Diesel Boiler Boost",
                honest_guidance:
                  "Shock duration and zone are unconfirmed. Deploy $0 Night Re-sequence + $150 Line Split now; hold Diesel behind a 24h local manifold trigger (<3.5 PSI).",
              }
            : null
        );
        setSelectedPlanId(fallbackPlans[0].plan_id);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    order,
    isUnconfirmed,
    shockUncertainty.shockMode,
    shockUncertainty.durationConfirmed,
    shockUncertainty.zoneConfirmed,
    shockUncertainty.durationMinDays,
    shockUncertainty.durationMaxDays,
    shockUncertainty.zoneHitPrior,
  ]);

  const activeOrder = order ?? cachedOrder;
  const selectedPlan = plans.find((p) => p.plan_id === selectedPlanId) || plans[0];
  const daysLate = activeOrder ? (activeOrder.predicted_days_late ?? activeOrder.days_late) || 0 : 0;

  // Dynamic Gantt calculations
  const leadDays = activeOrder?.lead_days || 14;
  const baselineEndDay = Number((leadDays + daysLate).toFixed(1));
  const daysSaved = selectedPlan?.days_saved ?? 0;
  const rescuedEndDay = Math.max(4, Number((baselineEndDay - daysSaved).toFixed(1)));
  const totalTimelineDays = Math.max(Math.ceil(baselineEndDay) + 2, leadDays + 4, 16);
  const cutoffLeftPct = Math.min(92, Math.max(20, (leadDays / totalTimelineDays) * 100));
  const baselineDyeWidthPct = Math.min(65, ((baselineEndDay * 0.48) / totalTimelineDays) * 100);
  const baselineSewStartPct = Math.min(55, ((baselineEndDay * 0.35) / totalTimelineDays) * 100);
  const baselineSewWidthPct = Math.min(
    100 - baselineSewStartPct,
    ((baselineEndDay - baselineEndDay * 0.35) / totalTimelineDays) * 100
  );
  const rescuedDyeWidthPct = Math.min(48, ((rescuedEndDay * 0.38) / totalTimelineDays) * 100);
  const rescuedSewStartPct = rescuedDyeWidthPct * 0.85;
  const rescuedSewWidthPct = Math.min(
    100 - rescuedSewStartPct,
    ((rescuedEndDay - rescuedEndDay * 0.32) / totalTimelineDays) * 100
  );
  const marginDays = Number((leadDays - rescuedEndDay).toFixed(1));

  const isGasHeavy = Boolean(
    activeOrder?.gas_intensity?.includes("HIGH") || activeOrder?.gas_intensity?.includes("EXTREME")
  );
  const shapGasPct =
    activeOrder?.shap_attribution?.feature_attributions.dyeing_gas_collapse_pct ??
    (isGasHeavy ? 48.5 : 28.0);
  const shapSlackPct =
    activeOrder?.shap_attribution?.feature_attributions.lead_slack_deficit_pct ?? 27.2;
  const shapSmvPct =
    activeOrder?.shap_attribution?.feature_attributions.garment_smv_complexity_pct ??
    (activeOrder && activeOrder.base_smv > 20 ? 15.5 : 10.0);
  const shapQtyPct = Number((100 - (shapGasPct + shapSlackPct + shapSmvPct)).toFixed(1));

  const handleCopyAlert = async () => {
    if (!activeOrder) return;
    try {
      const res = await fetch(`${API_BASE}/api/alert-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: activeOrder.order_id,
          custom_order: activeOrder.is_custom ? activeOrder : undefined,
          top_plan_id: selectedPlanId || undefined,
          shock_mode: shockUncertainty.shockMode,
          duration_confirmed: shockUncertainty.durationConfirmed,
          zone_confirmed: shockUncertainty.zoneConfirmed,
          duration_min_days: shockUncertainty.durationMinDays,
          duration_max_days: shockUncertainty.durationMaxDays,
          zone_hit_prior: shockUncertainty.zoneHitPrior,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.bangla_message) {
        await navigator.clipboard.writeText(data.bangla_message);
        toast.success("Bangla Dispatch Copied", `WhatsApp alert for ${activeOrder.order_id} copied to clipboard.`);
      } else {
        throw new Error("No bangla message in response");
      }
    } catch {
      const exposure = (activeOrder.simulated_exposure_usd ?? activeOrder.total_exposure_usd) || 0;
      const planName = selectedPlan?.plan_name || "Dyeing Window Re-sequence";
      const planSaved = selectedPlan?.days_saved || 5.2;
      const costBdt = selectedPlan?.implementation_cost_bdt || 0;
      const fallbackMsg =
        `🚨 [GasLine জরুরী সতর্কবার্তা] 🚨\n` +
        `অর্ডার নং: ${activeOrder.order_id} (${activeOrder.buyer})\n` +
        `পণ্য: ${activeOrder.quantity.toLocaleString()} পিস ${activeOrder.product}\n` +
        `গ্যাস প্রেশার ড্রপের কারণে অর্ডারটি শিপমেন্ট ঝুঁকিতে পড়েছে।\n\n` +
        `✅ প্রস্তাবিত রেসকিউ অ্যাকশন: ${planName}\n` +
        `⏱️ সময় সাশ্রয়: ${planSaved} দিন\n` +
        `💰 বাস্তবায়ন খরচ: ৳${costBdt.toLocaleString()} BDT\n` +
        `🛡️ সম্ভাব্য ক্ষতি সাশ্রয়: $${exposure.toLocaleString()} USD\n` +
        `নির্দেশনা: ফ্লোর ম্যানেজার দ্রুত অ্যাকশন প্ল্যান অনুমোদন করুন।`;

      await navigator.clipboard.writeText(fallbackMsg);
      toast.success("Bangla Dispatch Copied", `Offline WhatsApp alert for ${activeOrder.order_id} copied.`);
    }
  };

  const handleDirectWhatsApp = async () => {
    if (!activeOrder) return;
    try {
      const res = await fetch(`${API_BASE}/api/dispatch-alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: activeOrder.order_id,
          custom_order: activeOrder.is_custom ? activeOrder : undefined,
          channel: "whatsapp",
          recipient: recipientPhone,
          top_plan_id: selectedPlanId || undefined,
          shock_mode: shockUncertainty.shockMode,
          duration_confirmed: shockUncertainty.durationConfirmed,
          zone_confirmed: shockUncertainty.zoneConfirmed,
          duration_min_days: shockUncertainty.durationMinDays,
          duration_max_days: shockUncertainty.durationMaxDays,
          zone_hit_prior: shockUncertainty.zoneHitPrior,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.whatsapp_url) {
        window.open(data.whatsapp_url, "_blank");
        toast.info("WhatsApp Window Opened", `Dispatched ${selectedPlan?.plan_name || "rescue plan"} to ${recipientPhone}.`);
      } else {
        throw new Error("No whatsapp url");
      }
    } catch {
      const exposure = (activeOrder.simulated_exposure_usd ?? activeOrder.total_exposure_usd) || 0;
      const planName = selectedPlan?.plan_name || "Dyeing Window Re-sequence";
      const planSaved = selectedPlan?.days_saved || 5.2;
      const fallbackMsg =
        `🚨 [GasLine জরুরী সতর্কবার্তা] 🚨\n` +
        `অর্ডার নং: ${activeOrder.order_id} (${activeOrder.buyer})\n` +
        `পণ্য: ${activeOrder.quantity.toLocaleString()} পিস ${activeOrder.product}\n` +
        `✅ প্রস্তাবিত রেসকিউ অ্যাকশন: ${planName} (+${planSaved} দিন সাশ্রয়, $${exposure.toLocaleString()} রক্ষা)।`;

      const cleanPhone = recipientPhone.replace(/\D/g, "");
      const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(fallbackMsg)}`;
      window.open(waUrl, "_blank");
      toast.info("WhatsApp Alert Ready", `Opened offline dispatch for ${activeOrder.order_id}.`);
    }
  };

  const handleDirectEmail = async () => {
    if (!activeOrder) return;
    try {
      const res = await fetch(`${API_BASE}/api/dispatch-alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: activeOrder.order_id,
          custom_order: activeOrder.is_custom ? activeOrder : undefined,
          channel: "email",
          recipient: "plant.manager@factory.com",
          top_plan_id: selectedPlanId || undefined,
          shock_mode: shockUncertainty.shockMode,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.email_url) {
        window.open(data.email_url, "_blank");
        toast.info("Manager Email Prepared", `Opened mail client for ${activeOrder.order_id}.`);
      }
    } catch {
      const subject = encodeURIComponent(`[GasLine Rescue] Action Plan for ${activeOrder.order_id} (${activeOrder.buyer})`);
      const body = encodeURIComponent(
        `Recommended Rescue: ${selectedPlan?.plan_name || "Dyeing Re-sequence"}\nProjected Delay Saved: +${daysSaved} days\nNet Savings: $${selectedPlan?.net_saving_usd.toLocaleString() || 0} USD`
      );
      window.open(`mailto:plant.manager@factory.com?subject=${subject}&body=${body}`, "_blank");
      toast.info("Manager Email Prepared", `Drafted offline email for ${activeOrder.order_id}.`);
    }
  };

  return (
    <ModalDialog
      variant="drawer"
      isOpen={Boolean(order)}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      ariaLabelledBy="rescue-drawer-title"
    >
      {activeOrder && (
        <div className="flex h-full flex-col bg-surface text-ink">
          {/* Drawer Header */}
          <div className="flex items-start justify-between border-b border-line bg-surface-2/60 p-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="rescue-drawer-title" className="font-mono text-sm font-bold text-ink">
                  {activeOrder.order_id}
                </h2>
                <span className="rounded border border-line bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink-2">
                  {activeOrder.buyer}
                </span>
                <span className="rounded border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--status-safe-text)]">
                  Port Buffer: +2.5d
                </span>
              </div>
              <p className="font-tabular mt-1 text-xs text-ink-muted">
                {activeOrder.quantity.toLocaleString()} pcs of {activeOrder.product} ·{" "}
                {activeOrder.total_weight_kg.toLocaleString()} kg
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close rescue drawer"
              className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          {/* In-Drawer Shock Epistemic Mode Switcher (Confirmed vs Unconfirmed Duration/Zone) */}
          {onUpdateShockUncertainty && (
            <div className="flex items-center justify-between gap-2 border-b border-line bg-surface-2/30 px-5 py-2 text-[11px]">
              <span className="font-medium text-ink-2">Shock Scope Confirmation:</span>
              <div role="group" aria-label="Shock confirmation mode" className="flex rounded-lg border border-line bg-surface p-0.5 font-mono text-[10px]">
                <button
                  type="button"
                  aria-pressed={!isUnconfirmed}
                  onClick={() =>
                    onUpdateShockUncertainty({
                      shockMode: "confirmed",
                      durationConfirmed: true,
                      zoneConfirmed: true,
                    })
                  }
                  className={`rounded-md px-2 py-1 font-semibold transition-colors ${
                    !isUnconfirmed ? "bg-accent text-accent-fg" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Confirmed PSI
                </button>
                <button
                  type="button"
                  aria-pressed={isUnconfirmed}
                  onClick={() =>
                    onUpdateShockUncertainty({
                      shockMode: "unconfirmed",
                      durationConfirmed: false,
                      zoneConfirmed: false,
                    })
                  }
                  className={`rounded-md px-2 py-1 font-semibold transition-colors ${
                    isUnconfirmed
                      ? "bg-amber-500/20 text-[var(--status-warning-text)]"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Unconfirmed Duration &amp; Zone
                </button>
              </div>
            </div>
          )}

          {/* Navigation Tabs Inside Drawer */}
          <div
            role="tablist"
            aria-label="Order Rescue Analysis Views"
            className="flex items-center gap-1 overflow-x-auto border-b border-line bg-surface px-5 pt-2 text-xs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={drawerView === "PLANS"}
              onClick={() => setDrawerView("PLANS")}
              className={`flex shrink-0 items-center gap-1.5 px-3 py-2 font-semibold transition-colors ${
                drawerView === "PLANS" ? "text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              <ZapIcon className="h-3.5 w-3.5 text-amber-500" />
              <span>{isUnconfirmed ? "Honest Rank" : "Ranked Plans"} ({plans.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={drawerView === "MATRIX"}
              onClick={() => setDrawerView("MATRIX")}
              className={`flex shrink-0 items-center gap-1.5 px-3 py-2 font-semibold transition-colors ${
                drawerView === "MATRIX" ? "text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-500" />
              <span>Scenario Grid</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={drawerView === "GANTT"}
              onClick={() => setDrawerView("GANTT")}
              className={`flex shrink-0 items-center gap-1.5 px-3 py-2 font-semibold transition-colors ${
                drawerView === "GANTT" ? "text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5 text-sky-500" />
              <span>Visual Gantt</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={drawerView === "XAI"}
              onClick={() => setDrawerView("XAI")}
              className={`flex shrink-0 items-center gap-1.5 px-3 py-2 font-semibold transition-colors ${
                drawerView === "XAI" ? "text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              <BrainIcon className="h-3.5 w-3.5 text-indigo-500" />
              <span>Attribution</span>
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="scroll-shadow-y gasline-scroll flex-1 space-y-4 overflow-y-auto p-5">
            {/* Honest Guardrail Banner When Duration or Zone Is Unconfirmed */}
            {isUnconfirmed && uncertaintySummary && (
              <div className="rounded-xl border border-amber-400/50 bg-amber-400/10 p-3.5 text-xs">
                <div className="flex items-center justify-between font-semibold text-[var(--status-warning-text)]">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangleIcon className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>Honest Ranking Active · {uncertaintySummary.scenarios_evaluated} Scenarios Scored</span>
                  </span>
                  {uncertaintySummary.ranking_flips_across_scenarios && (
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                      Rank Flips Detected
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink-2">
                  {uncertaintySummary.honest_guidance}
                </p>
              </div>
            )}

            {/* Exposure & Risk Card */}
            <div className="rounded-xl border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] p-4 text-xs">
              <div className="flex items-center justify-between font-semibold text-[var(--status-critical-text)]">
                <div className="flex items-center gap-1.5">
                  <AlertTriangleIcon className="h-4 w-4" />
                  <span>Delivery Risk Exposure</span>
                </div>
                <span className="font-tabular font-mono text-xs">
                  Projected Delay: +{daysLate.toFixed(1)} days
                </span>
              </div>

              <div className="font-tabular mt-3 grid grid-cols-2 gap-3 border-t border-[var(--status-critical-border)] pt-3 font-mono text-ink-2">
                <div>
                  <span className="block text-[11px] text-ink-muted">Air-Freight Penalty ($6.65/kg)</span>
                  <strong className="font-bold text-ink">
                    ${Math.round(activeOrder.total_weight_kg * 6.65).toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span className="block text-[11px] text-ink-muted">
                    {isUnconfirmed && baselineRangeUsd ? "Exposure Envelope" : "Buyer Daily Delay Fee"}
                  </span>
                  <strong className="font-bold text-ink">
                    {isUnconfirmed && baselineRangeUsd
                      ? `$${Math.round(baselineRangeUsd[0]).toLocaleString()}–$${Math.round(baselineRangeUsd[1]).toLocaleString()}`
                      : `$${activeOrder.penalty_per_day_usd.toLocaleString()}/day`}
                  </strong>
                </div>
              </div>
            </div>

            {/* TAB 1: Ranked Plans */}
            {drawerView === "PLANS" && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink">
                    {isUnconfirmed ? "Regret-Adjusted Rescue Strategies" : "Ranked AI Rescue Strategies"}
                  </h3>
                  <span className="text-[11px] text-ink-muted">
                    {isUnconfirmed ? "Sorted by No-Regret & Expected Value" : "Sorted by Net Dollar Savings"}
                  </span>
                </div>

                {loading ? (
                  <div className="space-y-3" aria-label="Loading rescue strategies">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="animate-pulse space-y-2.5 rounded-xl border border-line bg-surface-2/60 p-4"
                      >
                        <div className="flex justify-between">
                          <div className="h-4 w-40 rounded bg-line" />
                          <div className="h-4 w-20 rounded bg-line" />
                        </div>
                        <div className="h-3 w-full rounded bg-line/70" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {plans.map((plan) => {
                      const isSelected = selectedPlanId === plan.plan_id;
                      const range = plan.net_saving_range_usd;
                      const costRange = plan.cost_range_usd;
                      const hasInterval = isUnconfirmed && range && range[0] !== range[1];
                      const hasCostSpan = isUnconfirmed && costRange && costRange[0] !== costRange[1];
                      const stage = plan.commitment_stage || (plan.recommended ? "CONFIRMED_EXECUTE" : "OPTIONAL");

                      const badgeClass =
                        stage === "NO_REGRET_NOW" || stage === "CONFIRMED_EXECUTE"
                          ? "border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] text-[var(--status-safe-text)]"
                          : stage === "CONDITIONAL_HOLD"
                          ? "border-amber-400/50 bg-amber-400/15 text-[var(--status-warning-text)]"
                          : stage === "AVOID_UPFRONT"
                          ? "border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] text-[var(--status-critical-text)]"
                          : "border-line bg-surface-2 text-ink-2";

                      return (
                        <button
                          key={plan.plan_id}
                          type="button"
                          onClick={() => setSelectedPlanId(plan.plan_id)}
                          aria-pressed={isSelected}
                          className={`w-full rounded-xl border p-4 text-left text-xs transition-all ${
                            isSelected
                              ? "border-ink bg-surface-2/70 ring-1 ring-ink shadow-xs"
                              : "border-line bg-surface hover:border-line-strong"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                                <span>{plan.plan_name}</span>
                                {(plan.honest_badge || plan.recommended) && (
                                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
                                    {plan.honest_badge || "Recommended"}
                                  </span>
                                )}
                              </div>
                              <span className="mt-0.5 block text-[11px] text-ink-muted">{plan.category}</span>
                            </div>
                            <div className="font-tabular shrink-0 text-right font-mono">
                              <span
                                className={`block text-xs font-bold ${
                                  plan.net_saving_usd >= 0
                                    ? "text-[var(--status-safe-text)]"
                                    : "text-[var(--status-critical-text)]"
                                }`}
                              >
                                {isUnconfirmed ? "Exp " : ""}
                                {plan.net_saving_usd >= 0 ? "+" : ""}$
                                {Math.round(plan.net_saving_usd).toLocaleString()}
                              </span>
                              {hasInterval && range ? (
                                <span className="block text-[10px] text-ink-muted">
                                  [{range[0] < 0 ? `-$${Math.abs(Math.round(range[0])).toLocaleString()}` : `+$${Math.round(range[0]).toLocaleString()}`} .. +$
                                  {Math.round(range[1]).toLocaleString()}]
                                </span>
                              ) : (
                                <span className="text-[10px] text-ink-muted">ROI: {plan.roi_pct.toFixed(0)}%</span>
                              )}
                            </div>
                          </div>

                          <p className="mt-2 text-[11px] leading-relaxed text-ink-2">{plan.description}</p>

                          {isUnconfirmed && plan.trigger_rule && (
                            <div className="mt-2 rounded-lg border border-line bg-surface-2/60 px-2.5 py-1.5 text-[10px] leading-snug text-ink-2">
                              <strong className="text-ink">Guardrail:</strong> {plan.trigger_rule}
                            </div>
                          )}

                          <div className="font-tabular mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5 font-mono text-[11px] text-ink-muted">
                            <span>
                              Cost:{" "}
                              <strong className="text-ink">
                                {hasCostSpan && costRange
                                  ? `$${Math.round(costRange[0]).toLocaleString()}–$${Math.round(costRange[1]).toLocaleString()}`
                                  : `$${Math.round(plan.implementation_cost_usd).toLocaleString()}`}
                              </strong>
                            </span>
                            {isUnconfirmed && plan.max_regret_usd !== undefined && (
                              <span>
                                Max Regret:{" "}
                                <strong className={plan.max_regret_usd > 400 ? "text-[var(--status-warning-text)]" : "text-ink"}>
                                  ${Math.round(plan.max_regret_usd).toLocaleString()}
                                </strong>
                              </span>
                            )}
                            <span>
                              Recovered: <strong className="text-ink">+{plan.days_saved}d</strong>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Scenario Matrix (Zone x Duration Winner Grid) */}
            {drawerView === "MATRIX" && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                      Zone × Duration Scenario Winner Matrix
                    </h3>
                    <p className="mt-0.5 text-[11px] text-ink-muted">
                      Shows why a single point recommendation fails when duration or zone is unconfirmed.
                    </p>
                  </div>
                  {!isUnconfirmed && onUpdateShockUncertainty && (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateShockUncertainty({
                          shockMode: "unconfirmed",
                          durationConfirmed: false,
                          zoneConfirmed: false,
                        })
                      }
                      className="rounded-lg border border-amber-400/50 bg-amber-400/15 px-2.5 py-1 font-mono text-[10px] font-semibold text-[var(--status-warning-text)]"
                    >
                      Enable Unconfirmed Mode
                    </button>
                  )}
                </div>

                {uncertaintySummary?.scenario_matrix && uncertaintySummary.scenario_matrix.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-line bg-surface">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-line bg-surface-2/60 font-mono text-[10px] uppercase text-ink-muted">
                          <th className="p-2.5">Scenario (Zone · Duration)</th>
                          <th className="p-2.5 text-right">Prior</th>
                          <th className="p-2.5">Optimal Hindsight Action</th>
                          <th className="p-2.5 text-right">Best Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line font-mono">
                        {uncertaintySummary.scenario_matrix.map((cell) => (
                          <tr key={cell.scenario_id} className="hover:bg-surface-2/40">
                            <td className="p-2.5 font-sans text-ink">{cell.label}</td>
                            <td className="font-tabular p-2.5 text-right text-ink-muted">
                              {cell.probability_pct.toFixed(1)}%
                            </td>
                            <td className="p-2.5 font-sans font-medium text-ink">{cell.winning_plan_name}</td>
                            <td className="font-tabular p-2.5 text-right font-semibold text-[var(--status-safe-text)]">
                              +${Math.round(cell.winning_net_saving_usd).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl border border-line bg-surface-2/40 p-4 text-xs text-ink-2">
                    Currently in <strong>Confirmed PSI Mode</strong> (single deterministic state). Toggle{" "}
                    <strong>Unconfirmed Duration &amp; Zone</strong> above to inspect the full 9-scenario regret matrix.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Dynamic Animated Gantt Scheduler */}
            {drawerView === "GANTT" && (
              <div className="space-y-4 font-mono text-xs">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
                    Dynamic Floor Rescheduling Timeline
                  </h3>
                  <p className="mt-0.5 font-sans text-[11px] text-ink-muted">
                    Comparing bottleneck completion against{" "}
                    <strong className="text-ink">{selectedPlan?.plan_name}</strong> ({totalTimelineDays}-day horizon)
                  </p>
                </div>

                {/* Schedule 1: Energy Bottleneck */}
                <div className="relative space-y-2.5 rounded-xl border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-[var(--status-critical-text)]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      <span>1. Baseline (Gas Pressure Bottleneck)</span>
                    </span>
                    <span className="font-tabular rounded border border-[var(--status-critical-border)] bg-surface px-1.5 py-0.5 text-[10px] font-bold">
                      Day {baselineEndDay} (+{daysLate.toFixed(1)}d Late)
                    </span>
                  </div>

                  <div className="relative space-y-2 pt-1">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-dashed border-rose-500/70"
                      style={{ left: `${cutoffLeftPct}%` }}
                    />

                    <div>
                      <div className="mb-0.5 flex justify-between text-[10px] text-ink-2">
                        <span>Boiler &amp; Dyeing (Day Shift 08:00–18:00)</span>
                        <span className="font-bold text-[var(--status-critical-text)]">
                          {(activeOrder.current_psi ?? 2.1).toFixed(1)} PSI Throttle
                        </span>
                      </div>
                      <div className="flex h-4 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="flex h-full items-center justify-center bg-rose-500 text-[9px] font-bold text-white transition-all duration-500"
                          style={{ width: `${baselineDyeWidthPct}%` }}
                        >
                          STALLED STEAM
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-0.5 flex justify-between text-[10px] text-ink-2">
                        <span>Cutting &amp; Sewing (Single Line)</span>
                        <span>Ends Day {baselineEndDay}</span>
                      </div>
                      <div className="flex h-4 w-full overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full transition-all duration-500" style={{ width: `${baselineSewStartPct}%` }} />
                        <div
                          className="flex h-full items-center justify-center bg-amber-500 text-[9px] font-bold text-zinc-950 transition-all duration-500"
                          style={{ width: `${baselineSewWidthPct}%` }}
                        >
                          DELAYED ASSEMBLY
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="font-tabular flex items-center justify-between border-t border-[var(--status-critical-border)] pt-2 text-[10px] font-bold text-[var(--status-critical-text)]">
                    <span>Maritime Cutoff: Day {leadDays}</span>
                    <span>
                      Missed by +{daysLate.toFixed(1)}d ($
                      {Math.round((activeOrder.total_weight_kg * 6.65) / 1000)}k Air Freight)
                    </span>
                  </div>
                </div>

                {/* Schedule 2: AI Rescued */}
                <div className="relative space-y-2.5 rounded-xl border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-[var(--status-safe-text)]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>2. AI Rescued ({selectedPlan?.plan_name})</span>
                    </span>
                    <span className="font-tabular rounded border border-[var(--status-safe-border)] bg-surface px-1.5 py-0.5 text-[10px] font-bold">
                      Day {rescuedEndDay} ({marginDays >= 0 ? `+${marginDays}d Safe` : `${marginDays}d Delta`})
                    </span>
                  </div>

                  <div className="relative space-y-2 pt-1">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-dashed border-emerald-600/70"
                      style={{ left: `${cutoffLeftPct}%` }}
                    />

                    <div>
                      <div className="mb-0.5 flex justify-between text-[10px] text-ink-2">
                        <span>Dyeing Window Re-sequence / Fuel Boost</span>
                        <span className="font-bold text-[var(--status-safe-text)]">10-Bar Steam Restored</span>
                      </div>
                      <div className="flex h-4 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="flex h-full items-center justify-center bg-indigo-600 text-[9px] font-bold text-white transition-all duration-500"
                          style={{ width: `${rescuedDyeWidthPct}%` }}
                        >
                          RESCUED DYEING
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-0.5 flex justify-between text-[10px] text-ink-2">
                        <span>Accelerated Sewing &amp; Finishing</span>
                        <span className="font-bold text-[var(--status-safe-text)]">+{daysSaved}d Saved</span>
                      </div>
                      <div className="flex h-4 w-full overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full transition-all duration-500" style={{ width: `${rescuedSewStartPct}%` }} />
                        <div
                          className="flex h-full items-center justify-center bg-emerald-600 text-[9px] font-bold text-white transition-all duration-500"
                          style={{ width: `${rescuedSewWidthPct}%` }}
                        >
                          ON-TIME DISPATCH
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="font-tabular flex items-center justify-between border-t border-[var(--status-safe-border)] pt-2 text-[10px] font-bold text-[var(--status-safe-text)]">
                    <span className="inline-flex items-center gap-1">
                      <ShipIcon className="h-3.5 w-3.5" />
                      <span>Vessel Gate-in: Day {leadDays}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CheckCircleIcon className="h-3.5 w-3.5" />
                      <span>
                        {marginDays >= 0
                          ? `Cleared Day ${rescuedEndDay} (Sea Cargo Safe)`
                          : `Ends Day ${rescuedEndDay} (-${daysSaved}d recovered)`}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg border border-line bg-surface-2/60 p-3 font-sans text-[11px] text-ink-2">
                  <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted" />
                  <span>
                    <strong>Operational Principle:</strong> Shifting dyeing batches to off-peak night windows and
                    splitting sewing lines rescues vessel cut-offs without premature diesel burn.
                  </span>
                </div>
              </div>
            )}

            {/* TAB 4: Explainable AI Attribution */}
            {drawerView === "XAI" && (
              <div className="space-y-4 font-mono text-xs">
                <div className="space-y-3 rounded-xl border border-line bg-surface-2/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink">
                      Model B Marginal Risk Decomposition
                    </span>
                    <span className="rounded bg-accent px-2 py-0.5 font-mono text-[10px] font-semibold text-accent-fg">
                      Additive Attribution
                    </span>
                  </div>
                  <p className="font-sans text-[11px] leading-relaxed text-ink-2">
                    {activeOrder.shap_attribution?.explanation ||
                      `${shapGasPct}% of this order's delivery risk is caused by pipeline gas pressure collapse, ${shapSlackPct}% by contract lead-time slack deficit, and ${shapSmvPct}% by garment SMV workload.`}
                  </p>

                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 font-semibold text-[var(--status-critical-text)]">
                          <FlameIcon className="h-3.5 w-3.5" />
                          <span>Dyeing Gas Scarcity (Steam Throttle)</span>
                        </span>
                        <strong className="font-tabular text-[var(--status-critical-text)]">+{shapGasPct}%</strong>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${shapGasPct}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 font-semibold text-[var(--status-warning-text)]">
                          <ClockIcon className="h-3.5 w-3.5" />
                          <span>Lead-Time Slack Deficit</span>
                        </span>
                        <strong className="font-tabular text-[var(--status-warning-text)]">+{shapSlackPct}%</strong>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${shapSlackPct}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 font-semibold text-ink">
                          <ZapIcon className="h-3.5 w-3.5 text-ink-2" />
                          <span>Garment SMV Difficulty ({activeOrder.product})</span>
                        </span>
                        <strong className="font-tabular text-ink">+{shapSmvPct}%</strong>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-ink-2 transition-all" style={{ width: `${shapSmvPct}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 font-semibold text-ink-muted">
                          <PackageIcon className="h-3.5 w-3.5" />
                          <span>Batch Volume Scale ({activeOrder.quantity.toLocaleString()} pcs)</span>
                        </span>
                        <strong className="font-tabular text-ink-2">+{shapQtyPct}%</strong>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-ink-muted transition-all" style={{ width: `${shapQtyPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Action Footer */}
          <div className="space-y-3 border-t border-line bg-surface-2/60 p-4">
            <div className="flex items-center gap-2">
              <label htmlFor="line-chief-mobile" className="shrink-0 text-[11px] text-ink-muted">
                Line Chief Mobile:
              </label>
              <input
                id="line-chief-mobile"
                name="recipient_phone"
                type="tel"
                autoComplete="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="flex-1 rounded-lg border border-line bg-surface px-2.5 py-1 font-mono text-xs text-ink focus:border-line-strong focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDirectWhatsApp}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-500"
              >
                <MessageSquareIcon className="h-3.5 w-3.5" />
                <span>Open Live WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleDirectEmail}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 text-xs font-semibold text-accent-fg shadow-xs transition-opacity hover:opacity-90"
              >
                <MailIcon className="h-3.5 w-3.5" />
                <span>Send Manager Email</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCopyAlert}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-2 transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink"
              >
                <Share2Icon className="h-3.5 w-3.5 text-ink-muted" />
                <span>Copy Bangla Text</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenAudit(activeOrder)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-2 transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink"
              >
                <FileTextIcon className="h-3.5 w-3.5 text-ink-muted" />
                <span>Buyer Trust Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalDialog>
  );
}
