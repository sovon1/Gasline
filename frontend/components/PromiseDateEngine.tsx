"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertTriangleIcon,
  AnchorIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  DownloadIcon,
  FlameIcon,
  PackageIcon,
  Share2Icon,
  ShieldCheckIcon,
  ZapIcon,
} from "./Icons";
import { Language } from "../data/translations";
import { OrderItem } from "./OrderLedger";
import { useToast } from "./ToastProvider";
import { API_BASE } from "../utils/api";
import { buildQuotePdfBytes, downloadPdfBytes } from "../utils/auditPdf";
import {
  addCalendarDays,
  diffCalendarDays,
  formatPlainDateDisplay,
  isValidIsoPlainDate,
} from "../utils/plainDate";

export interface ShockUncertaintyConfig {
  shockMode: "confirmed" | "unconfirmed";
  durationConfirmed: boolean;
  zoneConfirmed: boolean;
  durationMinDays: number;
  durationMaxDays: number;
  zoneHitPrior: number;
}

interface PromiseTier {
  confidence_pct: number;
  label: string;
  lead_days: number;
  ship_date: string;
  conformal_buffer_days: number;
}

interface RescueBackedOption {
  plan_id: string;
  plan_name: string;
  category: string;
  rescued_safe_90_days: number;
  rescued_safe_90_date: string;
  meets_buyer_date: boolean;
  expected_cost_usd: number;
  cost_range_usd: [number, number];
  unit_fob_addon_usd: number;
  order_value_pct: number;
  net_saving_vs_unrescued_usd: number;
  commitment_stage: string;
  honest_badge: string;
}

interface HorizonPoint {
  lead_days: number;
  ship_date: string;
  on_time_confidence_pct: number;
  expected_exposure_usd: number;
}

interface QuotePromiseResponse {
  quote_summary: {
    buyer: string;
    product: string;
    quantity: number;
    total_weight_kg: number;
    base_smv: number;
    gas_intensity: string;
    fob_unit_price_usd: number;
    order_value_usd: number;
    penalty_per_day_usd: number;
    order_start_date: string;
    zone_name: string;
    current_psi: number;
    shock_mode: "confirmed" | "unconfirmed";
    port_buffer_days: number;
    wip_queue_days: number;
  };
  buyer_request_evaluation: {
    requested_ship_date: string;
    requested_lead_days: number;
    on_time_confidence_pct: number;
    prob_late: number;
    expected_days_late: number;
    conformal_delay_range_days: [number, number];
    air_freight_exposure_usd: number;
    delay_penalty_usd: number;
    total_exposure_usd: number;
    days_short_of_safe_90: number;
    verdict: "SAFE_TO_ACCEPT" | "MARGINAL_BUFFER_RISK" | "COUNTER_OR_PREPRICE_RESCUE";
    verdict_label: string;
  };
  promise_tiers: {
    floor_50: PromiseTier;
    commercial_85: PromiseTier;
    recommended_90: PromiseTier;
    bulletproof_97: PromiseTier;
  };
  cheapest_rescue_to_meet_buyer_date: RescueBackedOption | null;
  rescue_backed_options: RescueBackedOption[];
  horizon_curve: HorizonPoint[];
  english_memo: string;
  bangla_memo: string;
}

interface PromiseDateEngineProps {
  currentPsi: number;
  currentSupply: number;
  dyeingCap: number;
  zoneName: string;
  lang: Language;
  shockUncertainty: ShockUncertaintyConfig;
  onUpdateShockUncertainty: (next: Partial<ShockUncertaintyConfig>) => void;
  onAcceptOrderToLedger?: (newOrder: OrderItem, openRescue?: boolean) => void;
}

const GARMENT_SPECS: Record<
  string,
  { smv: number; weightKg: number; gasInt: "LOW" | "MEDIUM" | "HIGH" | "EXTREME"; gasCode: number; fobUsd: number }
> = {
  "Cotton Hoodie": { smv: 24.5, weightKg: 0.55, gasInt: "HIGH", gasCode: 2, fobUsd: 11.5 },
  "Crewneck T-Shirt": { smv: 12.0, weightKg: 0.22, gasInt: "MEDIUM", gasCode: 1, fobUsd: 5.8 },
  "Denim Jeans": { smv: 28.0, weightKg: 0.68, gasInt: "EXTREME", gasCode: 3, fobUsd: 13.8 },
  "Polo Shirt": { smv: 18.0, weightKg: 0.3, gasInt: "HIGH", gasCode: 2, fobUsd: 8.2 },
  "Heavy Fleece Sweatshirt": { smv: 26.0, weightKg: 0.58, gasInt: "EXTREME", gasCode: 3, fobUsd: 12.4 },
  "Woven Chino Trouser": { smv: 20.5, weightKg: 0.44, gasInt: "LOW", gasCode: 0, fobUsd: 9.6 },
};

const BUYER_DEFAULTS: Record<string, number> = {
  "Inditex (Zara)": 2500,
  "H&M": 1800,
  "Marks & Spencer": 2200,
  Primark: 3000,
  Uniqlo: 2400,
  Target: 2000,
};

function computeLocalQuoteFallback(params: {
  buyer: string;
  product: string;
  quantity: number;
  smv: number;
  gasInt: string;
  fobUsd: number;
  orderStartDate: string;
  requestedLeadDays: number;
  currentPsi: number;
  zoneName: string;
  includePortBuffer: boolean;
  lineLoadPct: number;
  shockUncertainty: ShockUncertaintyConfig;
}): QuotePromiseResponse {
  const spec = GARMENT_SPECS[params.product] || GARMENT_SPECS["Cotton Hoodie"];
  const weight = Math.round(params.quantity * spec.weightKg * 10) / 10;
  const orderVal = Math.round(params.quantity * params.fobUsd);
  const dailyPenalty = BUYER_DEFAULTS[params.buyer] ?? 2000;
  const portDays = params.includePortBuffer ? 2.5 : 0;
  const wipQueueDays = Math.round(Math.max(0, (params.lineLoadPct - 70) * 0.12) * 10) / 10;
  const overhead = portDays + wipQueueDays;

  const isUnc =
    params.shockUncertainty.shockMode === "unconfirmed" ||
    !params.shockUncertainty.durationConfirmed ||
    !params.shockUncertainty.zoneConfirmed;

  const effPsi = isUnc
    ? (1 - params.shockUncertainty.zoneHitPrior) * 8.5 + params.shockUncertainty.zoneHitPrior * Math.min(params.currentPsi, 1.8)
    : params.currentPsi;

  const dyeCap = effPsi < 4.0 ? Math.max(0.12, 0.49 * (effPsi / 4.0)) : effPsi < 8.0 ? 0.7 + (effPsi - 4.0) * 0.05 : 0.95;
  const sewCap = effPsi < 4.0 ? 0.6 : effPsi < 8.0 ? 0.82 : 0.95;
  const gasCode = params.gasInt === "EXTREME" ? 3 : params.gasInt === "HIGH" ? 2 : params.gasInt === "MEDIUM" ? 1 : 0;
  const effCap = gasCode >= 2 ? dyeCap * 0.6 + sewCap * 0.4 : gasCode === 1 ? dyeCap * 0.3 + sewCap * 0.7 : dyeCap * 0.15 + sewCap * 0.85;

  const stdDays = (params.quantity * params.smv) / 7056.0;
  const floorProd = stdDays / Math.max(0.15, effCap);
  const floorDays = Math.max(8, Math.ceil(floorProd + overhead));
  const q85 = 4.19;
  const q90 = 5.38 + (isUnc ? 2.0 : 0);
  const q97 = 9.94 + (isUnc ? 4.5 : 0);

  const p85Days = Math.ceil(floorDays + q85);
  const p90Days = Math.max(p85Days + 1, Math.ceil(floorDays + q90));
  const p97Days = Math.max(p90Days + 2, Math.ceil(floorDays + q97));

  const reqDays = params.requestedLeadDays;
  const expectedLate = Math.max(0, Math.round((floorDays - reqDays) * 10) / 10);
  const probLate =
    reqDays >= p97Days
      ? 0.02
      : reqDays >= p90Days
      ? 0.08
      : reqDays >= p85Days
      ? 0.14
      : reqDays >= floorDays
      ? 0.38
      : Math.min(0.98, 0.55 + (floorDays - reqDays) * 0.035);
  const onTimeConf = Math.round((1 - probLate) * 1000) / 10;
  const airExp = probLate > 0.4 ? Math.round(weight * 6.65) : 0;
  const penExp = Math.round(expectedLate * dailyPenalty);

  const verdict =
    reqDays >= p90Days
      ? "SAFE_TO_ACCEPT"
      : reqDays >= p85Days
      ? "MARGINAL_BUFFER_RISK"
      : "COUNTER_OR_PREPRICE_RESCUE";

  const rescueOptions: RescueBackedOption[] = [
    {
      plan_id: "resequence_dyeing",
      plan_name: "Dyeing Window Re-sequence",
      category: "Zero-Cost Scheduling",
      rescued_safe_90_days: Math.max(10, p90Days - (isUnc ? 2 : 4)),
      rescued_safe_90_date: addCalendarDays(params.orderStartDate, Math.max(10, p90Days - (isUnc ? 2 : 4))),
      meets_buyer_date: Math.max(10, p90Days - (isUnc ? 2 : 4)) <= reqDays,
      expected_cost_usd: 0,
      cost_range_usd: [0, 0],
      unit_fob_addon_usd: 0,
      order_value_pct: 0,
      net_saving_vs_unrescued_usd: Math.round((airExp + penExp) * 0.45),
      commitment_stage: "NO_REGRET_NOW",
      honest_badge: "Execute Now (No-Regret)",
    },
    {
      plan_id: "line_split",
      plan_name: "Parallel Line Split",
      category: "Capacity Reallocation",
      rescued_safe_90_days: Math.max(10, p90Days - 6),
      rescued_safe_90_date: addCalendarDays(params.orderStartDate, Math.max(10, p90Days - 6)),
      meets_buyer_date: Math.max(10, p90Days - 6) <= reqDays,
      expected_cost_usd: 150,
      cost_range_usd: [150, 150],
      unit_fob_addon_usd: Math.round((150 / params.quantity) * 1000) / 1000,
      order_value_pct: Math.round((150 / Math.max(1, orderVal)) * 10000) / 100,
      net_saving_vs_unrescued_usd: Math.round((airExp + penExp) * 0.6 - 150),
      commitment_stage: "NO_REGRET_NOW",
      honest_badge: "Execute Now (No-Regret)",
    },
    {
      plan_id: "overtime_shift",
      plan_name: "2-Hour Daily Overtime",
      category: "Workforce Mobilization",
      rescued_safe_90_days: Math.max(10, p90Days - 8),
      rescued_safe_90_date: addCalendarDays(params.orderStartDate, Math.max(10, p90Days - 8)),
      meets_buyer_date: Math.max(10, p90Days - 8) <= reqDays,
      expected_cost_usd: isUnc ? 980 : 1250,
      cost_range_usd: isUnc ? [375, 2250] : [1250, 1250],
      unit_fob_addon_usd: Math.round(((isUnc ? 980 : 1250) / params.quantity) * 1000) / 1000,
      order_value_pct: Math.round(((isUnc ? 980 : 1250) / Math.max(1, orderVal)) * 10000) / 100,
      net_saving_vs_unrescued_usd: Math.round((airExp + penExp) * 0.7 - (isUnc ? 980 : 1250)),
      commitment_stage: isUnc ? "CONDITIONAL_HOLD" : "CONFIRMED_EXECUTE",
      honest_badge: isUnc ? "Hold Cash · Stage Trigger" : "Recommended",
    },
    {
      plan_id: "diesel_steam_boost",
      plan_name: "Dual-Fuel Diesel Boiler Boost",
      category: "Energy Substitution",
      rescued_safe_90_days: Math.ceil(stdDays / 0.93 + overhead + 5.38),
      rescued_safe_90_date: addCalendarDays(params.orderStartDate, Math.ceil(stdDays / 0.93 + overhead + 5.38)),
      meets_buyer_date: Math.ceil(stdDays / 0.93 + overhead + 5.38) <= reqDays,
      expected_cost_usd: isUnc ? 1640 : 1890,
      cost_range_usd: isUnc ? [380, 4265] : [1890, 1890],
      unit_fob_addon_usd: Math.round(((isUnc ? 1640 : 1890) / params.quantity) * 1000) / 1000,
      order_value_pct: Math.round(((isUnc ? 1640 : 1890) / Math.max(1, orderVal)) * 10000) / 100,
      net_saving_vs_unrescued_usd: Math.round((airExp + penExp) * 0.85 - (isUnc ? 1640 : 1890)),
      commitment_stage: isUnc ? "CONDITIONAL_HOLD" : "CONFIRMED_EXECUTE",
      honest_badge: isUnc ? "Hold Cash · Stage Trigger" : "Recommended",
    },
  ];

  const viable = rescueOptions.filter((r) => r.meets_buyer_date).sort((a, b) => a.expected_cost_usd - b.expected_cost_usd);
  const curveMin = Math.max(10, Math.min(reqDays - 6, floorDays - 8));
  const curveMax = Math.max(reqDays + 6, p97Days + 6);
  const step = Math.max(2, Math.round((curveMax - curveMin) / 10));
  const pts = Array.from(new Set([curveMin, reqDays, floorDays, p85Days, p90Days, p97Days, curveMax])).sort(
    (a, b) => a - b
  );
  for (let d = curveMin; d <= curveMax; d += step) {
    if (!pts.includes(d)) pts.push(d);
  }
  pts.sort((a, b) => a - b);

  const curve: HorizonPoint[] = pts.map((hd) => {
    const conf =
      hd >= p97Days
        ? 97.5
        : hd >= p90Days
        ? 90 + ((hd - p90Days) / Math.max(1, p97Days - p90Days)) * 7
        : hd >= p85Days
        ? 85 + ((hd - p85Days) / Math.max(1, p90Days - p85Days)) * 5
        : hd >= floorDays
        ? 50 + ((hd - floorDays) / Math.max(1, p85Days - floorDays)) * 35
        : Math.max(4, Math.round((hd / Math.max(1, floorDays)) * 48));
    return {
      lead_days: hd,
      ship_date: addCalendarDays(params.orderStartDate, hd),
      on_time_confidence_pct: Math.round(conf * 10) / 10,
      expected_exposure_usd: hd >= p85Days ? 0 : Math.round(airExp + Math.max(0, floorDays - hd) * dailyPenalty),
    };
  });

  const safe90Date = addCalendarDays(params.orderStartDate, p90Days);
  const reqDate = addCalendarDays(params.orderStartDate, reqDays);

  return {
    quote_summary: {
      buyer: params.buyer,
      product: params.product,
      quantity: params.quantity,
      total_weight_kg: weight,
      base_smv: params.smv,
      gas_intensity: params.gasInt,
      fob_unit_price_usd: params.fobUsd,
      order_value_usd: orderVal,
      penalty_per_day_usd: dailyPenalty,
      order_start_date: params.orderStartDate,
      zone_name: params.zoneName,
      current_psi: params.currentPsi,
      shock_mode: isUnc ? "unconfirmed" : "confirmed",
      port_buffer_days: portDays,
      wip_queue_days: wipQueueDays,
    },
    buyer_request_evaluation: {
      requested_ship_date: reqDate,
      requested_lead_days: reqDays,
      on_time_confidence_pct: onTimeConf,
      prob_late: probLate,
      expected_days_late: expectedLate,
      conformal_delay_range_days: [Math.max(0, Math.round((expectedLate - 5.38) * 10) / 10), Math.round((expectedLate + 5.38) * 10) / 10],
      air_freight_exposure_usd: airExp,
      delay_penalty_usd: penExp,
      total_exposure_usd: airExp + penExp,
      days_short_of_safe_90: Math.max(0, p90Days - reqDays),
      verdict,
      verdict_label:
        verdict === "SAFE_TO_ACCEPT"
          ? "Safe to Sign Buyer Date"
          : verdict === "MARGINAL_BUFFER_RISK"
          ? "Tight Margin (85–89% Conf)"
          : "Counter-Promise Safe Date or Pre-Price Rescue",
    },
    promise_tiers: {
      floor_50: {
        confidence_pct: 50,
        label: "Floor Completion (Zero Margin)",
        lead_days: floorDays,
        ship_date: addCalendarDays(params.orderStartDate, floorDays),
        conformal_buffer_days: 0,
      },
      commercial_85: {
        confidence_pct: 85,
        label: "Standard Commercial Promise",
        lead_days: p85Days,
        ship_date: addCalendarDays(params.orderStartDate, p85Days),
        conformal_buffer_days: q85,
      },
      recommended_90: {
        confidence_pct: 90,
        label: "Conformal Safe Promise (Recommended)",
        lead_days: p90Days,
        ship_date: safe90Date,
        conformal_buffer_days: Math.round(q90 * 100) / 100,
      },
      bulletproof_97: {
        confidence_pct: 97,
        label: "Bulletproof Crisis-Proof Promise",
        lead_days: p97Days,
        ship_date: addCalendarDays(params.orderStartDate, p97Days),
        conformal_buffer_days: Math.round(q97 * 100) / 100,
      },
    },
    cheapest_rescue_to_meet_buyer_date: viable[0] ?? null,
    rescue_backed_options: rescueOptions,
    horizon_curve: curve,
    english_memo: `[GasLine Pre-PO Quote Promise] Buyer: ${params.buyer} | ${params.quantity.toLocaleString()} pcs ${params.product} | Buyer Date ${reqDate} (${reqDays}d) = ${onTimeConf}% conf | Recommended 90% Conformal Safe Promise: ${safe90Date} (${p90Days}d).`,
    bangla_memo: `[GasLine প্রি-পিও শিপমেন্ট প্রতিশ্রুতি] বায়ার: ${params.buyer} | ${params.quantity.toLocaleString()} পিস ${params.product} | প্রস্তাবিত ৯০% নিরাপদ তারিখ: ${safe90Date} (${p90Days} দিন)।`,
  };
}

export default function PromiseDateEngine({
  currentPsi,
  currentSupply,
  zoneName,
  lang,
  shockUncertainty,
  onUpdateShockUncertainty,
  onAcceptOrderToLedger,
}: PromiseDateEngineProps) {
  const toast = useToast();
  const [buyer, setBuyer] = useState("Inditex (Zara)");
  const [garment, setGarment] = useState("Cotton Hoodie");
  const [smv, setSmv] = useState<number>(24.5);
  const [gasInt, setGasInt] = useState<"LOW" | "MEDIUM" | "HIGH" | "EXTREME">("HIGH");
  const [fobUsd, setFobUsd] = useState<number>(11.5);
  const [quantity, setQuantity] = useState<number>(15000);
  const [orderStartDate, setOrderStartDate] = useState<string>("2026-11-24");
  const [quotedLeadDays, setQuotedLeadDays] = useState<number>(42);
  const [requestedShipDate, setRequestedShipDate] = useState<string>(() => addCalendarDays("2026-11-24", 42));
  const [includePortBuffer, setIncludePortBuffer] = useState<boolean>(true);
  const [lineLoadPct, setLineLoadPct] = useState<number>(78);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isSyncingQuote, setIsSyncingQuote] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [quoteResult, setQuoteResult] = useState<QuotePromiseResponse | null>(null);

  const reqSeqRef = useRef(0);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const handleGarmentChange = (nextStyle: string) => {
    setGarment(nextStyle);
    const spec = GARMENT_SPECS[nextStyle];
    if (spec) {
      setSmv(spec.smv);
      setGasInt(spec.gasInt);
      setFobUsd(spec.fobUsd);
    }
  };

  const handleStartDateChange = (nextStart: string) => {
    setOrderStartDate(nextStart);
    if (isValidIsoPlainDate(nextStart)) {
      setRequestedShipDate(addCalendarDays(nextStart, quotedLeadDays));
      setFieldError(null);
    }
  };

  const handleShipDateChange = (nextShip: string) => {
    setRequestedShipDate(nextShip);
    if (isValidIsoPlainDate(orderStartDate) && isValidIsoPlainDate(nextShip)) {
      const diff = diffCalendarDays(orderStartDate, nextShip);
      if (diff >= 5 && diff <= 240) {
        setQuotedLeadDays(diff);
        setFieldError(null);
      }
    }
  };

  const handleLeadDaysChange = (nextDays: number) => {
    const clamped = Math.max(5, Math.min(240, nextDays));
    setQuotedLeadDays(clamped);
    if (isValidIsoPlainDate(orderStartDate)) {
      setRequestedShipDate(addCalendarDays(orderStartDate, clamped));
    }
    setFieldError(null);
  };

  const applyDemoPreset = (preset: "rush_hoodie" | "safe_tee" | "unconfirmed_denim") => {
    setFieldError(null);
    if (preset === "rush_hoodie") {
      setBuyer("Inditex (Zara)");
      handleGarmentChange("Cotton Hoodie");
      setQuantity(16000);
      setOrderStartDate("2026-11-24");
      handleLeadDaysChange(38);
      onUpdateShockUncertainty({ shockMode: "confirmed", durationConfirmed: true, zoneConfirmed: true });
    } else if (preset === "safe_tee") {
      setBuyer("H&M");
      handleGarmentChange("Crewneck T-Shirt");
      setQuantity(11000);
      setOrderStartDate("2026-11-24");
      handleLeadDaysChange(54);
      onUpdateShockUncertainty({ shockMode: "confirmed", durationConfirmed: true, zoneConfirmed: true });
    } else {
      setBuyer("Marks & Spencer");
      handleGarmentChange("Denim Jeans");
      setQuantity(18000);
      setOrderStartDate("2026-11-24");
      handleLeadDaysChange(45);
      onUpdateShockUncertainty({
        shockMode: "unconfirmed",
        durationConfirmed: false,
        zoneConfirmed: false,
        durationMinDays: 2,
        durationMaxDays: 21,
        zoneHitPrior: 0.55,
      });
    }
  };

  const evaluateQuote = useCallback(async () => {
    const seq = ++reqSeqRef.current;
    const safeStart = isValidIsoPlainDate(orderStartDate) ? orderStartDate : "2026-11-24";
    const safeQty = Math.max(500, Math.min(250000, quantity || 15000));
    const safeLead = Math.max(5, Math.min(240, quotedLeadDays || 42));

    // Immediate local preview while backend responds
    const localPreview = computeLocalQuoteFallback({
      buyer,
      product: garment,
      quantity: safeQty,
      smv,
      gasInt,
      fobUsd,
      orderStartDate: safeStart,
      requestedLeadDays: safeLead,
      currentPsi,
      zoneName,
      includePortBuffer,
      lineLoadPct,
      shockUncertainty,
    });
    setQuoteResult((prev) => prev ?? localPreview);
    setIsSyncingQuote(true);

    try {
      const res = await fetch(`${API_BASE}/api/quote-promise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer,
          product: garment,
          quantity: safeQty,
          base_smv: smv,
          gas_intensity: gasInt,
          fob_unit_price_usd: fobUsd,
          order_start_date: safeStart,
          buyer_requested_lead_days: safeLead,
          current_psi: currentPsi,
          national_supply_mmcfd: currentSupply,
          zone_name: zoneName,
          include_port_buffer: includePortBuffer,
          active_line_load_pct: lineLoadPct,
          shock_mode: shockUncertainty.shockMode,
          duration_confirmed: shockUncertainty.durationConfirmed,
          zone_confirmed: shockUncertainty.zoneConfirmed,
          duration_min_days: shockUncertainty.durationMinDays,
          duration_max_days: shockUncertainty.durationMaxDays,
          zone_hit_prior: shockUncertainty.zoneHitPrior,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: QuotePromiseResponse = await res.json();
      if (seq === reqSeqRef.current) {
        setQuoteResult(data);
      }
    } catch {
      if (seq === reqSeqRef.current) {
        setQuoteResult(localPreview);
      }
    } finally {
      if (seq === reqSeqRef.current) {
        setIsSyncingQuote(false);
      }
    }
  }, [
    buyer,
    garment,
    quantity,
    smv,
    gasInt,
    fobUsd,
    orderStartDate,
    quotedLeadDays,
    currentPsi,
    currentSupply,
    zoneName,
    includePortBuffer,
    lineLoadPct,
    shockUncertainty,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      evaluateQuote();
    }, 140);
    return () => window.clearTimeout(timer);
  }, [evaluateQuote]);

  const commitAcceptedQuote = async (targetLeadDays: number, targetDate: string, openRescueAfter: boolean) => {
    if (!quantity || quantity < 500) {
      setFieldError("Please enter a lot quantity of at least 500 pieces before accepting a quote.");
      qtyInputRef.current?.focus();
      return;
    }
    if (!isValidIsoPlainDate(orderStartDate) || diffCalendarDays(orderStartDate, requestedShipDate) < 5) {
      setFieldError("Target ship date must be at least 5 calendar days after the quotation date.");
      return;
    }

    setIsCommitting(true);
    const spec = GARMENT_SPECS[garment] || GARMENT_SPECS["Cotton Hoodie"];
    const totalWeightKg = Math.round(quantity * spec.weightKg * 10) / 10;
    const penaltyPerDay = BUYER_DEFAULTS[buyer] ?? 2000;
    const orderId = `PO-2026-Q${Math.floor(100 + Math.random() * 899)}`;

    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          buyer,
          product: garment,
          quantity,
          total_weight_kg: totalWeightKg,
          total_value_usd: Math.round(quantity * fobUsd),
          gas_intensity: gasInt,
          base_smv: smv,
          penalty_per_day_usd: penaltyPerDay,
          created_date: orderStartDate,
          promised_ship_date: targetDate,
          lead_days: targetLeadDays,
          current_psi: currentPsi,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created: OrderItem = await res.json();
      onAcceptOrderToLedger?.(created, openRescueAfter);
      toast.success(
        `Quote Accepted (${orderId})`,
        `Promised ship date ${formatPlainDateDisplay(targetDate)} (${targetLeadDays}d) committed to Live Order Book.`
      );
    } catch {
      const fallbackOrder: OrderItem = {
        order_id: orderId,
        buyer,
        product: garment,
        quantity,
        total_weight_kg: totalWeightKg,
        total_value_usd: Math.round(quantity * fobUsd),
        gas_intensity: gasInt,
        base_smv: smv,
        penalty_per_day_usd: penaltyPerDay,
        cancel_threshold_days: 10,
        created_date: orderStartDate,
        promised_ship_date: targetDate,
        actual_completion_date: targetDate,
        lead_days: targetLeadDays,
        days_late: 0,
        is_late: 0,
        air_freight_penalty_usd: 0,
        total_exposure_usd: 0,
        current_psi: currentPsi,
        predicted_prob_late: 0.08,
        predicted_days_late: 0,
        conformal_interval_90: [0, 5.38],
        simulated_exposure_usd: 0,
        simulated_is_late: 0,
        is_custom: true,
      };
      onAcceptOrderToLedger?.(fallbackOrder, openRescueAfter);
      toast.success(
        `Quote Accepted Offline (${orderId})`,
        `Promised ${formatPlainDateDisplay(targetDate)} added to Order Book.`
      );
    } finally {
      setIsCommitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!quoteResult) return;
    const safe90 = quoteResult.promise_tiers.recommended_90;
    commitAcceptedQuote(safe90.lead_days, safe90.ship_date, false);
  };

  const handleCopyMemo = async () => {
    if (!quoteResult) return;
    const text = lang === "bn" ? quoteResult.bangla_memo : quoteResult.english_memo;
    await navigator.clipboard.writeText(text);
    toast.success(
      "Quotation Promise Memo Copied",
      `Safe ship date ${formatPlainDateDisplay(quoteResult.promise_tiers.recommended_90.ship_date)} copied.`
    );
  };

  const handleDownloadQuotePdf = () => {
    if (!quoteResult) return;
    const qs = quoteResult.quote_summary;
    const reqEv = quoteResult.buyer_request_evaluation;
    const todayIso = new Date().toISOString().split("T")[0];
    const pdfBytes = buildQuotePdfBytes({
      buyer: qs.buyer,
      product: qs.product,
      quantity: qs.quantity,
      totalWeightKg: qs.total_weight_kg,
      baseSmv: qs.base_smv,
      gasIntensity: qs.gas_intensity,
      fobUnitPriceUsd: qs.fob_unit_price_usd,
      orderValueUsd: qs.order_value_usd,
      orderStartDate: qs.order_start_date,
      zoneName: qs.zone_name,
      currentPsi: qs.current_psi,
      shockMode: qs.shock_mode,
      portBufferDays: qs.port_buffer_days,
      wipQueueDays: qs.wip_queue_days,
      requestedShipDate: reqEv.requested_ship_date,
      requestedLeadDays: reqEv.requested_lead_days,
      onTimeConfidencePct: reqEv.on_time_confidence_pct,
      totalExposureUsd: reqEv.total_exposure_usd,
      verdictLabel: reqEv.verdict_label,
      isSafeToAccept: reqEv.verdict === "SAFE_TO_ACCEPT",
      tiers: quoteResult.promise_tiers,
      rescueOptions: quoteResult.rescue_backed_options,
      cheapestViableRescue: quoteResult.cheapest_rescue_to_meet_buyer_date,
      generatedDate: todayIso,
    });
    const slug = qs.buyer.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase() || "PO";
    const filename = `GasLine-Quote-${slug}-${reqEv.requested_lead_days}d.pdf`;
    downloadPdfBytes(pdfBytes, filename);
    toast.success("Quote Sheet PDF Downloaded", `Saved A4 quotation ${filename}.`);
  };

  const active = quoteResult;
  const reqEval = active?.buyer_request_evaluation;
  const tiers = active?.promise_tiers;
  const isSafeToAccept = reqEval?.verdict === "SAFE_TO_ACCEPT";
  const isMarginal = reqEval?.verdict === "MARGINAL_BUFFER_RISK";
  const isUnconfirmedShock =
    shockUncertainty.shockMode === "unconfirmed" ||
    !shockUncertainty.durationConfirmed ||
    !shockUncertainty.zoneConfirmed;

  // Interactive Horizon SVG geometry
  const curve = active?.horizon_curve ?? [];
  const minD = curve[0]?.lead_days ?? 15;
  const maxD = curve[curve.length - 1]?.lead_days ?? 90;
  const spanD = Math.max(1, maxD - minD);
  const svgW = 640;
  const svgH = 150;
  const padL = 36;
  const padR = 18;
  const padT = 16;
  const padB = 26;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const xFor = (d: number) => padL + ((d - minD) / spanD) * plotW;
  const yFor = (conf: number) => padT + (1 - Math.max(0, Math.min(100, conf)) / 100) * plotH;
  const polylinePts = curve.map((p) => `${xFor(p.lead_days).toFixed(1)},${yFor(p.on_time_confidence_pct).toFixed(1)}`).join(" ");

  return (
    <section className="space-y-5 rounded-xl border border-line bg-surface p-5 shadow-2xs">
      {/* Header & Quick Demo Presets */}
      <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-fg">
              <ClockIcon className="h-3.5 w-3.5" />
            </span>
            <h2 id="promise-engine-heading" className="text-sm font-semibold tracking-tight text-ink">
              {lang === "en"
                ? "Quotation-Time Promise-Date Engine"
                : "কোটেশন শিপ-ডেট প্রমিস ইঞ্জিন (অর্ডার গ্রহণের পূর্বে)"}
            </h2>
            <span className="rounded border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--status-safe-text)]">
              Model A + Model B + Conformal 85/90/97%
            </span>
            {isSyncingQuote && (
              <span className="rounded border border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--status-info-text)]">
                Scoring...
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {lang === "en"
              ? "Enter a prospective buyer inquiry before accepting the PO — GasLine computes exact calendar ship dates you can safely promise under live or unconfirmed gas shocks."
              : "বায়ারের অর্ডার গ্রহণ করার আগেই যাচাই করুন কোন তারিখে শিপমেন্টের প্রতিশ্রুতি দিলে এয়ার-ফ্রেইট জরিমানা এড়ানো যাবে।"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">Quick Inquiry:</span>
          <button
            type="button"
            onClick={() => applyDemoPreset("rush_hoodie")}
            className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 font-medium text-ink transition-colors hover:border-line-strong hover:bg-surface"
          >
            Zara 16k Hoodie (Tight 38d)
          </button>
          <button
            type="button"
            onClick={() => applyDemoPreset("safe_tee")}
            className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 font-medium text-ink transition-colors hover:border-line-strong hover:bg-surface"
          >
            H&amp;M 11k Tee (Safe 54d)
          </button>
          <button
            type="button"
            onClick={() => applyDemoPreset("unconfirmed_denim")}
            className="rounded-lg border border-amber-400/50 bg-amber-400/15 px-2.5 py-1 font-semibold text-[var(--status-warning-text)] transition-colors hover:bg-amber-400/25"
          >
            Unconfirmed Shock Quote
          </button>
        </div>
      </div>

      {/* Semantic Quotation Form */}
      <form aria-labelledby="promise-engine-heading" onSubmit={handleFormSubmit} className="space-y-5" noValidate>
        <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="quote-buyer" className="mb-1 block font-medium text-ink-2">
              {lang === "en" ? "Export Buyer Brand" : "বায়ার ব্র্যান্ড"}
            </label>
            <select
              id="quote-buyer"
              name="buyer"
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface-2 p-2 font-medium text-ink focus:border-line-strong focus:bg-surface focus:outline-none"
            >
              <option value="Inditex (Zara)">Inditex (Zara) — $2,500/day late fee</option>
              <option value="H&M">H&amp;M — $1,800/day late fee</option>
              <option value="Marks & Spencer">Marks &amp; Spencer — $2,200/day late fee</option>
              <option value="Primark">Primark — $3,000/day late fee</option>
              <option value="Uniqlo">Uniqlo — $2,400/day late fee</option>
              <option value="Target">Target — $2,000/day late fee</option>
            </select>
          </div>

          <div>
            <label htmlFor="quote-garment" className="mb-1 block font-medium text-ink-2">
              {lang === "en" ? "Garment Category / Style" : "পোশাকের ধরন"}
            </label>
            <select
              id="quote-garment"
              name="product"
              value={garment}
              onChange={(e) => handleGarmentChange(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface-2 p-2 font-medium text-ink focus:border-line-strong focus:bg-surface focus:outline-none"
            >
              <option value="Cotton Hoodie">Cotton Hoodie (SMV 24.5 · High Dye)</option>
              <option value="Crewneck T-Shirt">Crewneck T-Shirt (SMV 12.0 · Med Steam)</option>
              <option value="Denim Jeans">Denim Jeans (SMV 28.0 · Extreme Wash)</option>
              <option value="Polo Shirt">Polo Shirt (SMV 18.0 · High Dye)</option>
              <option value="Heavy Fleece Sweatshirt">Heavy Fleece Sweatshirt (SMV 26.0 · Extreme)</option>
              <option value="Woven Chino Trouser">Woven Chino Trouser (SMV 20.5 · Low Gas)</option>
            </select>
          </div>

          <div>
            <label htmlFor="quote-quantity" className="mb-1 block font-medium text-ink-2">
              {lang === "en" ? "Order Quantity (pieces)" : "অর্ডারের পরিমাণ (পিস)"} *
            </label>
            <input
              ref={qtyInputRef}
              id="quote-quantity"
              name="quantity"
              type="number"
              required
              min={500}
              max={250000}
              step={500}
              value={quantity}
              aria-invalid={fieldError ? "true" : undefined}
              aria-describedby="quote-qty-hint"
              onChange={(e) => {
                setFieldError(null);
                setQuantity(parseInt(e.target.value, 10) || 0);
              }}
              onBlur={() => {
                if (!quantity || quantity < 500) {
                  setFieldError("Enter at least 500 pieces for commercial export lot sizing.");
                }
              }}
              className="font-tabular w-full rounded-lg border border-line bg-surface-2 p-2 font-mono font-medium text-ink focus:border-line-strong focus:bg-surface focus:outline-none user-invalid:border-rose-500"
            />
            <span id="quote-qty-hint" className="mt-0.5 block font-mono text-[10px] text-ink-muted">
              SMV {smv}m · {gasInt} gas · FOB ${fobUsd.toFixed(2)}/pc
            </span>
          </div>

          <div>
            <label htmlFor="quote-target-date" className="mb-1 block font-medium text-ink-2">
              {lang === "en" ? "Buyer Target Ship Date" : "বায়ারের চাওয়া শিপ ডেট"} *
            </label>
            <div className="flex gap-1.5">
              <input
                id="quote-target-date"
                name="buyer_requested_date"
                type="date"
                required
                value={requestedShipDate}
                min={addCalendarDays(orderStartDate, 5)}
                onChange={(e) => handleShipDateChange(e.target.value)}
                className="font-tabular min-w-0 flex-1 rounded-lg border border-line bg-surface-2 p-2 font-mono text-xs font-medium text-ink focus:border-line-strong focus:bg-surface focus:outline-none"
              />
              <input
                id="quote-lead-days"
                name="buyer_requested_lead_days"
                type="number"
                min={5}
                max={240}
                aria-label="Target lead days"
                title="Target lead time in calendar days"
                value={quotedLeadDays}
                onChange={(e) => handleLeadDaysChange(parseInt(e.target.value, 10) || 30)}
                className="font-tabular w-16 rounded-lg border border-line bg-surface-2 p-2 text-center font-mono text-xs font-semibold text-ink focus:border-line-strong focus:bg-surface focus:outline-none"
              />
            </div>
            <span className="mt-0.5 block font-mono text-[10px] text-ink-muted">
              Quote Date: {formatPlainDateDisplay(orderStartDate)} ({quotedLeadDays}d window)
            </span>
          </div>
        </div>

        {/* Secondary Fine-Tuning & Unconfirmed Shock Fieldset */}
        <fieldset className="rounded-xl border border-line bg-surface-2/50 p-3.5 text-xs">
          <legend className="px-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Quotation Conditions · Port Buffer, WIP Queue &amp; Shock Confirmation State
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="quote-start-date" className="mb-1 block text-[11px] font-medium text-ink-2">
                Quotation / PO Start Date
              </label>
              <input
                id="quote-start-date"
                name="order_start_date"
                type="date"
                value={orderStartDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="font-tabular w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-xs text-ink focus:border-line-strong focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="quote-wip-load" className="mb-1 flex justify-between text-[11px] font-medium text-ink-2">
                <span>Factory Floor WIP Load</span>
                <span className="font-tabular font-mono font-semibold text-ink">{lineLoadPct}%</span>
              </label>
              <input
                id="quote-wip-load"
                name="active_line_load_pct"
                type="range"
                min={50}
                max={98}
                step={2}
                value={lineLoadPct}
                onChange={(e) => setLineLoadPct(parseInt(e.target.value, 10))}
                className="mt-1.5 w-full accent-emerald-600"
              />
              <span className="block font-mono text-[10px] text-ink-muted">
                +{active?.quote_summary.wip_queue_days?.toFixed(1) ?? "1.0"}d line queue before cutting
              </span>
            </div>

            <div className="flex items-start gap-2 pt-1 sm:pt-4">
              <input
                id="quote-port-buffer"
                name="include_port_buffer"
                type="checkbox"
                checked={includePortBuffer}
                onChange={(e) => setIncludePortBuffer(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line accent-emerald-600"
              />
              <label htmlFor="quote-port-buffer" className="cursor-pointer leading-snug text-ink-2">
                <span className="block font-semibold text-ink">Include CPA Port Buffer (+2.5d)</span>
                <span className="text-[10px] text-ink-muted">Chattogram yard dwell &amp; 48h feeder cut-off</span>
              </label>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-2">
              <input
                id="quote-unconfirmed-shock"
                name="unconfirmed_shock"
                type="checkbox"
                checked={isUnconfirmedShock}
                onChange={(e) => {
                  const nextUnc = e.target.checked;
                  onUpdateShockUncertainty({
                    shockMode: nextUnc ? "unconfirmed" : "confirmed",
                    durationConfirmed: !nextUnc,
                    zoneConfirmed: !nextUnc,
                  });
                }}
                className="mt-0.5 h-4 w-4 rounded border-line accent-amber-600"
              />
              <label htmlFor="quote-unconfirmed-shock" className="cursor-pointer leading-snug text-ink-2">
                <span className="block font-semibold text-[var(--status-warning-text)]">
                  Unconfirmed Shock Notice
                </span>
                <span className="text-[10px] text-ink-muted">
                  No confirmed duration ({shockUncertainty.durationMinDays}–{shockUncertainty.durationMaxDays}d) or zone
                </span>
              </label>
            </div>
          </div>
        </fieldset>

        {fieldError && (
          <div
            role="alert"
            className="rounded-lg border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] px-3 py-2 text-xs font-medium text-[var(--status-critical-text)]"
          >
            {fieldError}
          </div>
        )}

        {/* 4 Promise Tier Cards: Buyer Target vs 85% / 90% Recommended / 97% Bulletproof */}
        {active && reqEval && tiers && (
          <div role="status" aria-live="polite" className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Card 1: Buyer Target Verdict */}
              <div
                className={`rounded-xl border p-3.5 text-xs ${
                  isSafeToAccept
                    ? "border-[var(--status-safe-border)] bg-[var(--status-safe-bg)]"
                    : isMarginal
                    ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]"
                    : "border-[var(--status-critical-border)] bg-[var(--status-critical-bg)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-2">
                    Buyer Requested
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                      isSafeToAccept
                        ? "bg-emerald-500/20 text-[var(--status-safe-text)]"
                        : isMarginal
                        ? "bg-amber-500/20 text-[var(--status-warning-text)]"
                        : "bg-rose-500/20 text-[var(--status-critical-text)]"
                    }`}
                  >
                    {reqEval.on_time_confidence_pct.toFixed(0)}% On-Time
                  </span>
                </div>
                <div className="font-tabular mt-2 font-mono text-lg font-bold text-ink">
                  {formatPlainDateDisplay(reqEval.requested_ship_date)}
                </div>
                <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-ink-2">
                  <span>{reqEval.requested_lead_days} calendar days</span>
                  {reqEval.total_exposure_usd > 0 ? (
                    <span className="font-semibold text-[var(--status-critical-text)]">
                      ${reqEval.total_exposure_usd.toLocaleString()} risk
                    </span>
                  ) : (
                    <span className="font-semibold text-[var(--status-safe-text)]">$0 penalty risk</span>
                  )}
                </div>
                <p className="mt-2 border-t border-line/60 pt-1.5 text-[11px] font-medium text-ink">
                  {isSafeToAccept ? "✓ Safe to accept as requested" : `✗ ${reqEval.days_short_of_safe_90}d short of 90% safe window`}
                </p>
              </div>

              {/* Card 2: 85% Commercial Promise */}
              <div className="rounded-xl border border-line bg-surface-2/40 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                    Commercial Tier
                  </span>
                  <span className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink-2">
                    85% Conf
                  </span>
                </div>
                <div className="font-tabular mt-2 font-mono text-lg font-bold text-ink">
                  {formatPlainDateDisplay(tiers.commercial_85.ship_date)}
                </div>
                <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-ink-muted">
                  <span>{tiers.commercial_85.lead_days} days total</span>
                  <span>+{tiers.commercial_85.conformal_buffer_days}d q85</span>
                </div>
                <p className="mt-2 border-t border-line pt-1.5 text-[11px] text-ink-2">
                  Competitive promise when buyer allows minor slack.
                </p>
              </div>

              {/* Card 3: 90% Conformal Recommended Safe Date */}
              <div className="rounded-xl border-2 border-emerald-500/70 bg-[var(--status-safe-bg)] p-3.5 text-xs shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--status-safe-text)]">
                    <ShieldCheckIcon className="h-3.5 w-3.5" />
                    <span>Safe Promise</span>
                  </span>
                  <span className="rounded bg-emerald-600 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                    90% Conformal
                  </span>
                </div>
                <div className="font-tabular mt-2 font-mono text-lg font-bold text-ink">
                  {formatPlainDateDisplay(tiers.recommended_90.ship_date)}
                </div>
                <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-[var(--status-safe-text)]">
                  <span>{tiers.recommended_90.lead_days} days total</span>
                  <span>+{tiers.recommended_90.conformal_buffer_days}d buffer</span>
                </div>
                <p className="mt-2 border-t border-[var(--status-safe-border)] pt-1.5 text-[11px] font-semibold text-ink">
                  Recommended promise before signing ($0 rescue spend).
                </p>
              </div>

              {/* Card 4: 97% Bulletproof Promise */}
              <div className="rounded-xl border border-line bg-surface-2/40 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                    Zero-Default Tier
                  </span>
                  <span className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink">
                    97% Conf
                  </span>
                </div>
                <div className="font-tabular mt-2 font-mono text-lg font-bold text-ink">
                  {formatPlainDateDisplay(tiers.bulletproof_97.ship_date)}
                </div>
                <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-ink-muted">
                  <span>{tiers.bulletproof_97.lead_days} days total</span>
                  <span>+{tiers.bulletproof_97.conformal_buffer_days}d q97</span>
                </div>
                <p className="mt-2 border-t border-line pt-1.5 text-[11px] text-ink-2">
                  Absorbs prolonged LNG outage &amp; port congestion tail.
                </p>
              </div>
            </div>

            {/* Interactive Horizon Confidence Curve + Pre-Signing Rescue Options */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Left: On-Time Confidence vs Ship Date SVG Chart */}
              <div className="rounded-xl border border-line bg-surface-2/30 p-4 lg:col-span-5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Ship-Date Confidence Curve</span>
                  <span className="font-mono text-[10px] text-ink-muted">
                    {active.quote_summary.current_psi.toFixed(1)} PSI · {isUnconfirmedShock ? "Unconfirmed Envelope" : "Confirmed Grid"}
                  </span>
                </div>
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  role="img"
                  aria-label="On-time shipment confidence percentage across candidate delivery horizons"
                  className="h-36 w-full overflow-visible"
                >
                  {/* 90% Conformal Reference Line */}
                  <line
                    x1={padL}
                    x2={svgW - padR}
                    y1={yFor(90)}
                    y2={yFor(90)}
                    stroke="currentColor"
                    strokeDasharray="4 4"
                    className="text-emerald-500/60"
                  />
                  <text x={padL + 4} y={yFor(90) - 4} className="fill-emerald-600 font-mono text-[9px] font-semibold">
                    90% Safe Threshold
                  </text>

                  {/* Axes */}
                  <line x1={padL} x2={padL} y1={padT} y2={svgH - padB} stroke="currentColor" className="text-line-strong" />
                  <line x1={padL} x2={svgW - padR} y1={svgH - padB} y2={svgH - padB} stroke="currentColor" className="text-line-strong" />
                  <text x={4} y={yFor(100) + 3} className="fill-current font-mono text-[9px] text-ink-muted">
                    100%
                  </text>
                  <text x={8} y={yFor(50) + 3} className="fill-current font-mono text-[9px] text-ink-muted">
                    50%
                  </text>
                  <text x={14} y={yFor(0)} className="fill-current font-mono text-[9px] text-ink-muted">
                    0%
                  </text>

                  {/* Confidence Curve */}
                  {curve.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      points={polylinePts}
                      className="text-ink"
                    />
                  )}

                  {/* Buyer Target Marker */}
                  <circle
                    cx={xFor(reqEval.requested_lead_days)}
                    cy={yFor(reqEval.on_time_confidence_pct)}
                    r="5"
                    className={isSafeToAccept ? "fill-emerald-500" : "fill-rose-500"}
                  />
                  <text
                    x={Math.min(svgW - 75, Math.max(padL + 4, xFor(reqEval.requested_lead_days) - 24))}
                    y={Math.max(12, yFor(reqEval.on_time_confidence_pct) - 8)}
                    className={`font-mono text-[9px] font-bold ${isSafeToAccept ? "fill-emerald-600" : "fill-rose-500"}`}
                  >
                    Buyer ({reqEval.requested_lead_days}d)
                  </text>

                  {/* Safe 90% Marker */}
                  <circle
                    cx={xFor(tiers.recommended_90.lead_days)}
                    cy={yFor(90)}
                    r="5"
                    className="fill-emerald-600"
                  />
                  <text
                    x={Math.min(svgW - 88, Math.max(padL + 4, xFor(tiers.recommended_90.lead_days) - 20))}
                    y={yFor(90) + 14}
                    className="fill-emerald-600 font-mono text-[9px] font-bold"
                  >
                    Safe 90% ({tiers.recommended_90.lead_days}d)
                  </text>

                  {/* X-axis endpoints */}
                  <text x={padL} y={svgH - 6} className="fill-current font-mono text-[9px] text-ink-muted">
                    {formatPlainDateDisplay(addCalendarDays(orderStartDate, minD))} ({minD}d)
                  </text>
                  <text x={svgW - padR} y={svgH - 6} textAnchor="end" className="fill-current font-mono text-[9px] text-ink-muted">
                    {formatPlainDateDisplay(addCalendarDays(orderStartDate, maxD))} ({maxD}d)
                  </text>
                </svg>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 font-mono text-[10px] text-ink-muted">
                  <span className="inline-flex items-center gap-1">
                    <AnchorIcon className="h-3 w-3" />
                    CPA Port: +{active.quote_summary.port_buffer_days.toFixed(1)}d
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <PackageIcon className="h-3 w-3" />
                    Lot Weight: {active.quote_summary.total_weight_kg.toLocaleString()} kg
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FlameIcon className="h-3 w-3 text-amber-500" />
                    FOB Value: ${active.quote_summary.order_value_usd.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Right: Pre-Signing Rescue Pricing Table (How to keep buyer's tight date profitably) */}
              <div className="rounded-xl border border-line bg-surface-2/30 p-4 lg:col-span-7">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-semibold text-ink">
                      Pre-Signing Rescue Options (Can We Keep {formatPlainDateDisplay(reqEval.requested_ship_date)}?)
                    </span>
                    <p className="text-[11px] text-ink-muted">
                      Price operational rescues into unit FOB margin before signing instead of paying $6.65/kg air freight later.
                    </p>
                  </div>
                  {isUnconfirmedShock && (
                    <span className="rounded border border-amber-400/50 bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--status-warning-text)]">
                      Honest Cost Intervals Active
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-line font-mono text-[10px] uppercase text-ink-muted">
                        <th className="py-1.5 pr-2">Intervention</th>
                        <th className="py-1.5 px-2">Unlocked 90% Date</th>
                        <th className="py-1.5 px-2">Hits Target?</th>
                        <th className="py-1.5 px-2 text-right">FOB Add-on</th>
                        <th className="py-1.5 pl-2 text-right">Policy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60 font-mono">
                      {active.rescue_backed_options.slice(0, 4).map((opt) => {
                        const rangeDiffers = opt.cost_range_usd[0] !== opt.cost_range_usd[1];
                        return (
                          <tr key={opt.plan_id} className="hover:bg-surface/60">
                            <td className="py-2 pr-2 font-sans font-medium text-ink">{opt.plan_name}</td>
                            <td className="font-tabular py-2 px-2 text-ink-2">
                              {formatPlainDateDisplay(opt.rescued_safe_90_date)} ({opt.rescued_safe_90_days}d)
                            </td>
                            <td className="py-2 px-2">
                              {opt.meets_buyer_date ? (
                                <span className="inline-flex items-center gap-1 rounded bg-[var(--status-safe-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--status-safe-text)]">
                                  <CheckCircleIcon className="h-3 w-3" /> YES
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-ink-muted">
                                  <AlertTriangleIcon className="h-3 w-3 text-amber-500" /> Short
                                </span>
                              )}
                            </td>
                            <td className="font-tabular py-2 px-2 text-right text-ink">
                              <span className="font-semibold">+${opt.unit_fob_addon_usd.toFixed(3)}/pc</span>
                              <span className="block text-[10px] text-ink-muted">
                                {rangeDiffers
                                  ? `$${opt.cost_range_usd[0].toLocaleString()}–$${opt.cost_range_usd[1].toLocaleString()}`
                                  : `$${opt.expected_cost_usd.toLocaleString()}`}
                              </span>
                            </td>
                            <td className="py-2 pl-2 text-right font-sans">
                              <span
                                className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                                  opt.commitment_stage === "NO_REGRET_NOW"
                                    ? "border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] text-[var(--status-safe-text)]"
                                    : opt.commitment_stage === "CONDITIONAL_HOLD"
                                    ? "border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
                                    : "border-line bg-surface text-ink-2"
                                }`}
                              >
                                {opt.honest_badge}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Action Bar: Commit Safe Date vs Commit Buyer Date + Rescue vs Copy Memo / Quote PDF */}
            <div className="flex flex-col justify-between gap-3 border-t border-line pt-4 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1 text-xs text-ink-2">
                {active.cheapest_rescue_to_meet_buyer_date && !isSafeToAccept ? (
                  <span>
                    <strong className="text-ink">Commercial Edge:</strong> Counter-offer{" "}
                    <strong className="font-mono text-[var(--status-safe-text)]">
                      {formatPlainDateDisplay(tiers.recommended_90.ship_date)}
                    </strong>{" "}
                    for $0 extra cost, or accept{" "}
                    <strong className="font-mono">{formatPlainDateDisplay(reqEval.requested_ship_date)}</strong> with{" "}
                    <strong>{active.cheapest_rescue_to_meet_buyer_date.plan_name}</strong> (+$
                    {active.cheapest_rescue_to_meet_buyer_date.unit_fob_addon_usd.toFixed(3)}/pc).
                  </span>
                ) : (
                  <span>
                    <strong className="text-ink">Ready to Commit:</strong> Accepting inserts this PO directly into the
                    live factory Order Book with Model B tracking.
                  </span>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-nowrap">
                <button
                  type="button"
                  onClick={handleCopyMemo}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-2 text-xs font-medium text-ink-2 transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink"
                >
                  <Share2Icon className="h-3.5 w-3.5" />
                  <span>Copy Memo</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadQuotePdf}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-2 text-xs font-medium text-ink-2 transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink"
                >
                  <DownloadIcon className="h-3.5 w-3.5" />
                  <span>Quote PDF</span>
                </button>

                {!isSafeToAccept && (
                  <button
                    type="button"
                    disabled={isCommitting}
                    onClick={() =>
                      commitAcceptedQuote(reqEval.requested_lead_days, reqEval.requested_ship_date, true)
                    }
                    className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-amber-400/50 bg-amber-400/15 px-3 py-2 text-xs font-semibold text-[var(--status-warning-text)] transition-colors hover:bg-amber-400/25 disabled:opacity-50"
                  >
                    <ZapIcon className="h-3.5 w-3.5 text-amber-500" />
                    <span>Accept Target Date &amp; Plan Rescue</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isCommitting}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>
                    Accept Safe Date ({formatPlainDateDisplay(tiers.recommended_90.ship_date)})
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
