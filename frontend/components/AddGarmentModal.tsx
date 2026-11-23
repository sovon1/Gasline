"use client";

import React, { useState } from "react";
import ModalDialog from "./ModalDialog";
import { OrderItem } from "./OrderLedger";
import {
  AlertTriangleIcon,
  DownloadIcon,
  FileTextIcon,
  PlusIcon,
  ShieldCheckIcon,
  UploadCloudIcon,
  XIcon,
  ZapIcon,
} from "./Icons";
import { Language, translations } from "../data/translations";
import { useToast } from "./ToastProvider";

interface AddGarmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddOrder: (newOrder: OrderItem, openRescueNow?: boolean) => void;
  currentPsi: number;
  dyeingCap: number;
  lang?: Language;
}

interface GarmentPreset {
  name: string;
  category: string;
  defaultSmv: number;
  unitWeightKg: number;
  gasIntensity: string;
  fobPriceUsd: number;
}

const GARMENT_PRESETS: GarmentPreset[] = [
  {
    name: "Basic Crewneck T-Shirt",
    category: "160 GSM Single Jersey",
    defaultSmv: 12.5,
    unitWeightKg: 0.18,
    gasIntensity: "LOW (Cut & Sew Only)",
    fobPriceUsd: 3.8,
  },
  {
    name: "Pique Cotton Polo Shirt",
    category: "220 GSM Cotton Pique",
    defaultSmv: 16.5,
    unitWeightKg: 0.26,
    gasIntensity: "MEDIUM (Wash & Press)",
    fobPriceUsd: 5.5,
  },
  {
    name: "Heavy Fleece Pullover Hoodie",
    category: "320 GSM CVC Brushed Fleece",
    defaultSmv: 24.5,
    unitWeightKg: 0.58,
    gasIntensity: "HIGH (Continuous Steam)",
    fobPriceUsd: 9.8,
  },
  {
    name: "Denim Stone-Washed Jeans",
    category: "12 oz Ring-Spun Denim",
    defaultSmv: 28.5,
    unitWeightKg: 0.72,
    gasIntensity: "EXTREME (Batch Dye & Dry)",
    fobPriceUsd: 12.5,
  },
  {
    name: "Twill Chino Trousers",
    category: "240 GSM Cotton Spandex",
    defaultSmv: 21.0,
    unitWeightKg: 0.44,
    gasIntensity: "MEDIUM (Wash & Press)",
    fobPriceUsd: 8.2,
  },
  {
    name: "Jacquard Knit Sweater",
    category: "Gauge 12 Acrylic/Wool",
    defaultSmv: 32.0,
    unitWeightKg: 0.62,
    gasIntensity: "HIGH (Continuous Steam)",
    fobPriceUsd: 14.0,
  },
];

const BUYER_PRESETS = [
  { name: "H&M", penaltyRate: 850 },
  { name: "Inditex / Zara", penaltyRate: 1400 },
  { name: "Marks & Spencer", penaltyRate: 1100 },
  { name: "Primark", penaltyRate: 750 },
  { name: "Target USA", penaltyRate: 950 },
  { name: "Walmart Global", penaltyRate: 1250 },
  { name: "Next UK", penaltyRate: 1050 },
];

export default function AddGarmentModal({
  isOpen,
  onClose,
  onAddOrder,
  currentPsi,
  dyeingCap,
  lang = "en",
}: AddGarmentModalProps) {
  const toast = useToast();
  const [tab, setTab] = useState<"MANUAL" | "BULK">("MANUAL");
  const t = translations[lang];

  const [orderId, setOrderId] = useState<string>("LOT-2026-NEW");

  React.useEffect(() => {
    if (isOpen) {
      setOrderId(`LOT-2026-${Math.floor(100 + Math.random() * 900)}`);
    }
  }, [isOpen]);
  const [buyer, setBuyer] = useState<string>("Inditex / Zara");
  const [product, setProduct] = useState<string>("Heavy Fleece Pullover Hoodie");
  const [quantity, setQuantity] = useState<number>(18500);
  const [baseSmv, setBaseSmv] = useState<number>(24.5);
  const [unitWeight, setUnitWeight] = useState<number>(0.58);
  const [gasIntensity, setGasIntensity] = useState<string>("HIGH (Continuous Steam)");
  const [leadDays, setLeadDays] = useState<number>(14);
  const [penaltyPerDay, setPenaltyPerDay] = useState<number>(1400);
  const [unitFob, setUnitFob] = useState<number>(9.8);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [bulkOrders, setBulkOrders] = useState<any[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const totalWeightKg = Math.round(quantity * unitWeight);
  const totalValueUsd = Math.round(quantity * unitFob);

  const workloadMinutes = quantity * baseSmv;
  const standardDays = Number((workloadMinutes / 7056.0).toFixed(1));
  const leadSlack = leadDays - standardDays;
  const gasWeight = gasIntensity.includes("EXTREME")
    ? 1.5
    : gasIntensity.includes("HIGH")
    ? 1.25
    : gasIntensity.includes("MEDIUM")
    ? 1.0
    : 0.7;
  const pressureDeficit = Math.max(0, 10.0 - currentPsi);
  const estDaysLate = Math.max(
    0,
    Number((pressureDeficit * gasWeight * 0.45 - leadSlack * 0.25).toFixed(1))
  );
  const estProbLate = estDaysLate > 0.5 ? Math.min(0.99, 0.55 + estDaysLate * 0.08) : 0.08;
  const estAirFreight = estProbLate > 0.4 ? totalWeightKg * 6.65 : 0;
  const estExposure = Math.round(estAirFreight + estDaysLate * penaltyPerDay);

  const applyPreset = (preset: GarmentPreset) => {
    setProduct(preset.name);
    setBaseSmv(preset.defaultSmv);
    setUnitWeight(preset.unitWeightKg);
    setGasIntensity(preset.gasIntensity);
    setUnitFob(preset.fobPriceUsd);
  };

  const applyBuyer = (name: string, rate: number) => {
    setBuyer(name);
    setPenaltyPerDay(rate);
  };

  const handleManualSubmit = async (openRescueNow: boolean) => {
    setIsSubmitting(true);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + leadDays);
    const dateStr = dueDate.toISOString().split("T")[0];

    const payload = {
      order_id: orderId || `LOT-2026-${Math.floor(100 + Math.random() * 900)}`,
      buyer,
      product,
      quantity,
      total_weight_kg: totalWeightKg,
      total_value_usd: totalValueUsd,
      gas_intensity: gasIntensity,
      base_smv: baseSmv,
      penalty_per_day_usd: penaltyPerDay,
      cancel_threshold_days: 10,
      promised_ship_date: dateStr,
      lead_days: leadDays,
      current_psi: currentPsi,
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const scoredOrder = await res.json();
        setIsSubmitting(false);
        onAddOrder(scoredOrder, openRescueNow);
        toast.success("Garment Lot Added", `${scoredOrder.order_id} scored at ${currentPsi.toFixed(1)} PSI.`);
        onClose();
        return;
      }
    } catch {
      // Offline fallback
    }

    const fallbackOrder: OrderItem = {
      order_id: payload.order_id,
      buyer: payload.buyer,
      product: payload.product,
      quantity: payload.quantity,
      total_weight_kg: payload.total_weight_kg,
      total_value_usd: payload.total_value_usd,
      gas_intensity: payload.gas_intensity,
      base_smv: payload.base_smv,
      penalty_per_day_usd: payload.penalty_per_day_usd,
      cancel_threshold_days: 10,
      promised_ship_date: payload.promised_ship_date,
      lead_days: payload.lead_days,
      days_late: estDaysLate,
      is_late: estDaysLate > 0.5 ? 1 : 0,
      air_freight_penalty_usd: estAirFreight,
      total_exposure_usd: estExposure,
      predicted_prob_late: estProbLate,
      predicted_days_late: estDaysLate,
      conformal_interval_90: [
        Math.max(0, Number((estDaysLate - 2.62).toFixed(1))),
        Number((estDaysLate + 2.62).toFixed(1)),
      ],
      simulated_exposure_usd: estExposure,
      simulated_is_late: estDaysLate > 0.5 ? 1 : 0,
      is_custom: true,
    };

    onAddOrder(fallbackOrder, openRescueNow);
    toast.success("Garment Lot Added", `${fallbackOrder.order_id} scored locally.`);
    onClose();
    setIsSubmitting(false);
  };

  const handleDownloadSampleCsv = () => {
    const csv = `order_id,buyer,product,quantity,base_smv,lead_days,penalty_per_day_usd,gas_intensity
LOT-2026-HM01,H&M,Basic Crewneck T-Shirt,25000,12.5,18,850,LOW
LOT-2026-ZR02,Inditex / Zara,Heavy Fleece Pullover Hoodie,15000,24.5,12,1400,HIGH
LOT-2026-MS03,Marks & Spencer,Denim Stone-Washed Jeans,18000,28.5,15,1100,EXTREME
LOT-2026-PM04,Primark,Pique Cotton Polo Shirt,30000,16.5,20,750,MEDIUM
LOT-2026-TG05,Target USA,Twill Chino Trousers,12000,21.0,14,950,MEDIUM`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "garment_orders_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string) => {
    setBulkError(null);
    try {
      const lines = text.trim().split("\n");
      if (lines.length < 2) {
        setBulkError("CSV must contain a header row and at least one order row.");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const parsed: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const row: any = {};
        headers.forEach((h, idx) => {
          row[h] = vals[idx];
        });

        parsed.push({
          order_id: row.order_id || `LOT-2026-IMP-${i}`,
          buyer: row.buyer || "Custom Buyer",
          product: row.product || "Custom Apparel Lot",
          quantity: parseInt(row.quantity, 10) || 10000,
          base_smv: parseFloat(row.base_smv) || 18.0,
          lead_days: parseInt(row.lead_days, 10) || 14,
          penalty_per_day_usd: parseFloat(row.penalty_per_day_usd) || 1000.0,
          gas_intensity: (row.gas_intensity || "HIGH").toUpperCase(),
          current_psi: currentPsi,
        });
      }

      setBulkOrders(parsed);
    } catch {
      setBulkError("Failed to parse CSV. Please check formatting.");
    }
  };

  const handleBulkSubmit = async () => {
    if (bulkOrders.length === 0) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: bulkOrders }),
      });

      if (res.ok) {
        const scored = await res.json();
        const list = Array.isArray(scored) ? scored : [scored];
        list.forEach((ord) => onAddOrder(ord, false));
        toast.success("Batch Imported", `Scored and imported ${list.length} garment lots.`);
        onClose();
        setIsSubmitting(false);
        return;
      }
    } catch {
      // Offline fallback
    }

    bulkOrders.forEach((o) => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + o.lead_days);
      const fallback: OrderItem = {
        order_id: o.order_id,
        buyer: o.buyer,
        product: o.product,
        quantity: o.quantity,
        total_weight_kg: Math.round(o.quantity * 0.35),
        total_value_usd: Math.round(o.quantity * 8.0),
        gas_intensity: o.gas_intensity,
        base_smv: o.base_smv,
        penalty_per_day_usd: o.penalty_per_day_usd,
        cancel_threshold_days: 10,
        promised_ship_date: dueDate.toISOString().split("T")[0],
        lead_days: o.lead_days,
        days_late: 3.5,
        is_late: 1,
        air_freight_penalty_usd: Math.round(o.quantity * 0.35 * 6.65),
        total_exposure_usd: Math.round(o.quantity * 0.35 * 6.65 + 3.5 * o.penalty_per_day_usd),
        predicted_prob_late: 0.92,
        predicted_days_late: 3.5,
        conformal_interval_90: [1.2, 5.8],
        simulated_exposure_usd: Math.round(o.quantity * 0.35 * 6.65 + 3.5 * o.penalty_per_day_usd),
        simulated_is_late: 1,
        is_custom: true,
      };
      onAddOrder(fallback, false);
    });

    toast.success("Batch Imported", `Imported ${bulkOrders.length} garment lots locally.`);
    onClose();
    setIsSubmitting(false);
  };

  return (
    <ModalDialog
      variant="modal"
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      ariaLabelledBy="add-garment-title"
    >
      <div className="flex max-h-[90dvh] flex-col overflow-hidden bg-surface text-ink">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line bg-surface-2/60 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
              <PlusIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 id="add-garment-title" className="flex flex-wrap items-center gap-2 text-base font-bold text-ink">
                <span>{t.addGarmentTitle}</span>
                <span className="rounded border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 font-mono text-[10px] text-[var(--status-warning-text)]">
                  {currentPsi.toFixed(1)} PSI Active Grid
                </span>
              </h2>
              <p className="text-xs text-ink-muted">{t.addGarmentSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close garment input modal"
            className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Accessible Tab Selection */}
        <div
          role="tablist"
          aria-label="Garment Entry Modes"
          className="flex items-center gap-1 border-b border-line bg-surface px-6 pt-2 text-xs font-medium"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "MANUAL"}
            onClick={() => setTab("MANUAL")}
            className={`flex items-center gap-1.5 px-3.5 py-2 font-semibold transition-colors ${
              tab === "MANUAL" ? "text-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            <span>{t.manualEntryTab}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "BULK"}
            onClick={() => setTab("BULK")}
            className={`flex items-center gap-1.5 px-3.5 py-2 font-semibold transition-colors ${
              tab === "BULK" ? "text-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            <FileTextIcon className="h-3.5 w-3.5" />
            <span>{t.bulkCsvTab}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="scroll-shadow-y gasline-scroll flex-1 overflow-y-auto p-6 text-xs">
          {tab === "MANUAL" ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-5 lg:col-span-7">
                <div>
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-ink-2">
                    {t.garmentPresets}
                  </span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {GARMENT_PRESETS.map((preset) => {
                      const isSelected = product === preset.name;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className={`rounded-lg border p-2.5 text-left transition-all ${
                            isSelected
                              ? "border-accent bg-accent text-accent-fg shadow-xs"
                              : "border-line bg-surface-2/50 text-ink hover:border-line-strong"
                          }`}
                        >
                          <div className="truncate text-[11px] font-semibold">{preset.name}</div>
                          <div className={`truncate text-[10px] ${isSelected ? "opacity-80" : "text-ink-muted"}`}>
                            SMV {preset.defaultSmv}m · {preset.unitWeightKg}kg
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-ink-2">
                    {t.buyerLabel}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {BUYER_PRESETS.map((b) => (
                      <button
                        key={b.name}
                        type="button"
                        onClick={() => applyBuyer(b.name, b.penaltyRate)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                          buyer === b.name
                            ? "border-accent bg-accent text-accent-fg"
                            : "border-line bg-surface text-ink-2 hover:bg-surface-2"
                        }`}
                      >
                        {b.name} (${b.penaltyRate}/d)
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                  <div>
                    <label htmlFor="add-order-id" className="mb-1 block text-[11px] font-medium text-ink-2">
                      Order / Style ID
                    </label>
                    <input
                      id="add-order-id"
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      className="w-full rounded-lg border border-line bg-surface-2 px-3 py-1.5 font-mono text-ink focus:border-line-strong focus:bg-surface focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-product" className="mb-1 block text-[11px] font-medium text-ink-2">
                      {t.productStyle}
                    </label>
                    <input
                      id="add-product"
                      type="text"
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                      className="w-full rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-ink focus:border-line-strong focus:bg-surface focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-qty" className="mb-1 block text-[11px] font-medium text-ink-2">
                      {t.orderQty}
                    </label>
                    <input
                      id="add-qty"
                      type="number"
                      step="500"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(100, parseInt(e.target.value, 10) || 0))}
                      className="font-tabular w-full rounded-lg border border-line bg-surface-2 px-3 py-1.5 font-mono text-ink focus:border-line-strong focus:bg-surface focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-smv" className="mb-1 block text-[11px] font-medium text-ink-2">
                      {t.smvLabel}
                    </label>
                    <input
                      id="add-smv"
                      type="number"
                      step="0.5"
                      value={baseSmv}
                      onChange={(e) => setBaseSmv(Math.max(1, parseFloat(e.target.value) || 0))}
                      className="font-tabular w-full rounded-lg border border-line bg-surface-2 px-3 py-1.5 font-mono text-ink focus:border-line-strong focus:bg-surface focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-lead" className="mb-1 block text-[11px] font-medium text-ink-2">
                      {t.leadTimeDays}
                    </label>
                    <input
                      id="add-lead"
                      type="number"
                      value={leadDays}
                      onChange={(e) => setLeadDays(Math.max(1, parseInt(e.target.value, 10) || 0))}
                      className="font-tabular w-full rounded-lg border border-line bg-surface-2 px-3 py-1.5 font-mono text-ink focus:border-line-strong focus:bg-surface focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="add-penalty" className="mb-1 block text-[11px] font-medium text-ink-2">
                      {t.penaltyPerDay}
                    </label>
                    <input
                      id="add-penalty"
                      type="number"
                      step="100"
                      value={penaltyPerDay}
                      onChange={(e) => setPenaltyPerDay(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="font-tabular w-full rounded-lg border border-line bg-surface-2 px-3 py-1.5 font-mono text-ink focus:border-line-strong focus:bg-surface focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <span className="mb-1.5 block text-[11px] font-medium text-ink-2">{t.gasDependency}</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "LOW (Cut & Sew Only)", desc: "Boiler loss has low impact" },
                      { label: "MEDIUM (Wash & Press)", desc: "Standard steam finishing" },
                      { label: "HIGH (Continuous Steam)", desc: "Dyeing / heavy finishing" },
                      { label: "EXTREME (Batch Dye & Dry)", desc: "Boiler stoppage fatal" },
                    ].map((g) => {
                      const active = gasIntensity.startsWith(g.label.split(" ")[0]);
                      return (
                        <button
                          key={g.label}
                          type="button"
                          onClick={() => setGasIntensity(g.label)}
                          className={`rounded-lg border p-2 text-left transition-all ${
                            active
                              ? "border-ink bg-surface-2 font-semibold text-ink"
                              : "border-line text-ink-2 hover:bg-surface-2/50"
                          }`}
                        >
                          <div className="text-[11px]">{g.label}</div>
                          <div className="text-[10px] font-normal text-ink-muted">{g.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: AI Live Stress-Test Scoring */}
              <div className="flex flex-col justify-between space-y-4 rounded-xl border border-line bg-surface-2/60 p-4 lg:col-span-5">
                <div>
                  <div className="flex items-center justify-between border-b border-line pb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink">
                      AI Stress-Test Evaluation
                    </span>
                    <span className="inline-flex items-center gap-1 rounded border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--status-safe-text)]">
                      <ShieldCheckIcon className="h-3 w-3" />
                      <span>Model B (99.3% Acc)</span>
                    </span>
                  </div>

                  <p className="mt-2 text-[11px] text-ink-muted">
                    Inference at active line pressure (<strong className="text-ink">{currentPsi.toFixed(1)} PSI</strong>
                    ) and boiler steam capacity (
                    <strong className="text-ink">{(dyeingCap * 100).toFixed(1)}%</strong>).
                  </p>

                  <div className="font-tabular mt-4 space-y-2.5">
                    <div className="rounded-lg border border-line bg-surface p-3 shadow-2xs">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                        Late Shipment Risk
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span
                          className={`font-mono text-xl font-bold ${
                            estProbLate > 0.5
                              ? "text-[var(--status-critical-text)]"
                              : "text-[var(--status-safe-text)]"
                          }`}
                        >
                          {(estProbLate * 100).toFixed(1)}%
                        </span>
                        <span
                          className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                            estProbLate > 0.5
                              ? "border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] text-[var(--status-critical-text)]"
                              : "border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] text-[var(--status-safe-text)]"
                          }`}
                        >
                          {estProbLate > 0.5 ? "CRITICAL RISK" : "ON TIME"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-line bg-surface p-3 shadow-2xs">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                        Projected Bottleneck Delay
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="font-mono text-xl font-bold text-ink">
                          {estDaysLate > 0 ? `+${estDaysLate} days` : "0 days"}
                        </span>
                        <span className="font-mono text-[10px] text-ink-muted">
                          90%: [{Math.max(0, Number((estDaysLate - 2.62).toFixed(1)))},{" "}
                          {Number((estDaysLate + 2.62).toFixed(1))}]d
                        </span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-line bg-surface p-3 shadow-2xs">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-muted">
                        Financial Exposure at Risk
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="font-mono text-xl font-bold text-ink">
                          ${estExposure.toLocaleString()} USD
                        </span>
                        <span className="font-mono text-[10px] text-ink-muted">
                          ≈ ৳{((estExposure * 120) / 100000).toFixed(1)}L BDT
                        </span>
                      </div>
                      <div className="mt-1 border-t border-line pt-1 text-[10px] text-ink-muted">
                        Air Freight (${estAirFreight.toLocaleString()}) + Delay ($
                        {(estDaysLate * penaltyPerDay).toLocaleString()})
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t border-line pt-3">
                  <button
                    type="button"
                    onClick={() => handleManualSubmit(false)}
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 font-semibold text-accent-fg shadow-xs transition-opacity hover:opacity-90"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>{t.analyzeAndAdd}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleManualSubmit(true)}
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white shadow-xs transition-colors hover:bg-rose-500"
                  >
                    <ZapIcon className="h-3.5 w-3.5" />
                    <span>{t.analyzeAndRescue}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-line bg-surface-2/60 p-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-bold text-ink">Bulk Garment Production Import</h3>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    Upload an export production plan (.csv) with Order ID, Buyer, Garment Style, Quantity, SMV, and Lead
                    Time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 font-medium text-ink shadow-2xs transition-colors hover:bg-surface-2"
                >
                  <DownloadIcon className="h-3.5 w-3.5 text-ink-muted" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              <div className="relative cursor-pointer rounded-xl border-2 border-dashed border-line-strong bg-surface-2/40 p-8 text-center transition-colors hover:border-ink-muted">
                <input
                  type="file"
                  accept=".csv,.txt"
                  aria-label="Upload CSV production plan"
                  onChange={handleFileUpload}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <span className="rounded-full border border-line bg-surface p-3 text-ink-2">
                    <UploadCloudIcon className="h-6 w-6" />
                  </span>
                  <div className="text-xs font-semibold text-ink">Click to select a CSV file or drag and drop</div>
                  <div className="text-[11px] text-ink-muted">
                    Supports UTF-8 CSV exports from FastReact, SAP Apparel, or Excel
                  </div>
                </div>
              </div>

              {bulkError && (
                <div className="flex items-center gap-2 rounded-lg border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] p-3 text-xs text-[var(--status-critical-text)]">
                  <AlertTriangleIcon className="h-4 w-4 shrink-0" />
                  <span>{bulkError}</span>
                </div>
              )}

              {bulkOrders.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink">Parsed Garment Lots ({bulkOrders.length})</span>
                    <span className="rounded border border-[var(--status-safe-border)] bg-[var(--status-safe-bg)] px-2 py-0.5 font-mono text-[11px] text-[var(--status-safe-text)]">
                      Ready for AI Batch Scoring
                    </span>
                  </div>

                  <div className="max-h-56 overflow-x-auto rounded-lg border border-line">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-line bg-surface-2 text-[10px] uppercase text-ink-muted">
                          <th className="px-3 py-2">Order ID</th>
                          <th className="px-3 py-2">Buyer</th>
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2">Quantity</th>
                          <th className="px-3 py-2">SMV</th>
                          <th className="px-3 py-2">Lead Days</th>
                          <th className="px-3 py-2">Gas Intensity</th>
                        </tr>
                      </thead>
                      <tbody className="font-tabular divide-y divide-line font-mono">
                        {bulkOrders.map((o, idx) => (
                          <tr key={idx} className="hover:bg-surface-2/40">
                            <td className="px-3 py-2 font-semibold text-ink">{o.order_id}</td>
                            <td className="px-3 py-2 font-sans text-ink-2">{o.buyer}</td>
                            <td className="px-3 py-2 font-sans text-ink-2">{o.product}</td>
                            <td className="px-3 py-2">{o.quantity.toLocaleString()}</td>
                            <td className="px-3 py-2">{o.base_smv}m</td>
                            <td className="px-3 py-2">{o.lead_days}d</td>
                            <td className="px-3 py-2 text-[10px]">{o.gas_intensity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleBulkSubmit}
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 rounded-lg bg-accent px-6 py-2.5 font-bold text-accent-fg shadow-xs transition-opacity hover:opacity-90"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Score &amp; Import All {bulkOrders.length} Lots</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalDialog>
  );
}
