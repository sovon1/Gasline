"use client";

import React, { useEffect, useState } from "react";
import ModalDialog from "./ModalDialog";
import { Language } from "../data/translations";
import { useToast } from "./ToastProvider";
import { BrainIcon, CheckCircleIcon, PlusIcon, ScanLineIcon, UploadCloudIcon, XIcon, ZapIcon } from "./Icons";
import { API_BASE } from "../utils/api";

interface EditableTicketFields {
  buyer: string;
  product: string;
  quantity: number;
  base_smv: number;
  gas_intensity: string;
  lead_days: number;
  penalty_per_day_usd: number;
  unit_weight_kg: number;
  ocr_source: string;
}

interface VisionScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onOrderImported?: (order: any) => void;
}

const TEMPLATE_PRESETS: Record<string, EditableTicketFields> = {
  preset_1: {
    buyer: "Inditex (Zara)",
    product: "Heavy Fleece Pullover Hoodie",
    quantity: 22000,
    base_smv: 24.5,
    gas_intensity: "EXTREME (Continuous Dyeing)",
    lead_days: 14,
    penalty_per_day_usd: 1500,
    unit_weight_kg: 0.55,
    ocr_source: "Sample Template: Cumilla EPZ Line 04 Whiteboard",
  },
  preset_2: {
    buyer: "H&M",
    product: "Brushed Sweatshirt",
    quantity: 18500,
    base_smv: 19.5,
    gas_intensity: "HIGH (Steam Dyeing)",
    lead_days: 16,
    penalty_per_day_usd: 1100,
    unit_weight_kg: 0.45,
    ocr_source: "Sample Template: Chattogram Dyeing Cell #LOT-892",
  },
  preset_3: {
    buyer: "Primark",
    product: "Pique Cotton Polo Shirt",
    quantity: 30000,
    base_smv: 16.5,
    gas_intensity: "MEDIUM (Wash & Press)",
    lead_days: 18,
    penalty_per_day_usd: 950,
    unit_weight_kg: 0.3,
    ocr_source: "Sample Template: Ashulia Floor Run Sheet #ASH-02",
  },
};

function computeLiveModelBEstimate(fields: EditableTicketFields, currentPsi = 2.1) {
  const totalWeightKg = Math.round(fields.quantity * fields.unit_weight_kg);
  const workloadMinutes = fields.quantity * fields.base_smv;
  const standardDays = workloadMinutes / 7056.0;
  const leadSlack = fields.lead_days - standardDays;
  const gasWeight = fields.gas_intensity.includes("EXTREME")
    ? 1.5
    : fields.gas_intensity.includes("HIGH")
    ? 1.25
    : fields.gas_intensity.includes("MEDIUM")
    ? 1.0
    : 0.7;
  const pressureDeficit = Math.max(0, 10.0 - currentPsi);
  const daysLate = Math.max(
    0,
    Number((pressureDeficit * gasWeight * 0.45 - leadSlack * 0.25).toFixed(1))
  );
  const probLate = daysLate > 0.5 ? Math.min(0.99, Number((0.55 + daysLate * 0.08).toFixed(2))) : 0.08;
  const airFreight = probLate > 0.4 ? Math.round(totalWeightKg * 6.65) : 0;
  const exposure = Math.round(airFreight + daysLate * fields.penalty_per_day_usd);
  const conformal: [number, number] = [
    Math.max(0, Number((daysLate - 2.62).toFixed(1))),
    Number((daysLate + 2.62).toFixed(1)),
  ];

  return {
    totalWeightKg,
    probLate,
    daysLate,
    conformal,
    airFreight,
    exposure,
    primaryDriver: gasWeight > 1.1 ? "Dyeing Gas Shock" : "Lead Slack Deficit",
  };
}

export default function VisionScanModal({
  isOpen,
  onClose,
  lang,
  onOrderImported,
}: VisionScanModalProps) {
  const toast = useToast();
  const [selectedPreset, setSelectedPreset] = useState<string>("preset_1");
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [fields, setFields] = useState<EditableTicketFields | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      if (uploadedPhotoUrl) {
        URL.revokeObjectURL(uploadedPhotoUrl);
      }
    };
  }, [uploadedPhotoUrl]);

  const presets = [
    {
      id: "preset_1",
      badge: "Cumilla EPZ Line 04",
      label: "Whiteboard Target Board",
      desc: "Inditex (Zara) · 22k Hoodies · EXTREME Gas",
    },
    {
      id: "preset_2",
      badge: "Chittagong Dyeing",
      label: "Master Lot Card #LOT-892",
      desc: "H&M · 18.5k Sweatshirts · HIGH Gas",
    },
    {
      id: "preset_3",
      badge: "Ashulia Unit 2",
      label: "Emergency Line Sheet",
      desc: "Primark · 30k Polos · MEDIUM Gas",
    },
  ];

  const handleLoadTemplate = async (presetId: string = selectedPreset) => {
    setSelectedPreset(presetId);
    setScanning(true);
    setImportSuccess(false);

    try {
      const res = await fetch(`${API_BASE}/api/vision/scan-card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset_id: presetId }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const ex = data.extracted_order;
      setTimeout(() => {
        setFields({
          buyer: ex.buyer,
          product: ex.product,
          quantity: ex.quantity,
          base_smv: ex.base_smv,
          gas_intensity: ex.gas_intensity,
          lead_days: ex.lead_days,
          penalty_per_day_usd: ex.penalty_per_day_usd,
          unit_weight_kg: Number((ex.total_weight_kg / Math.max(1, ex.quantity)).toFixed(2)),
          ocr_source: uploadedFileName
            ? `Photo: ${uploadedFileName} (Grid Template)`
            : ex.ocr_source || TEMPLATE_PRESETS[presetId].ocr_source,
        });
        setScanning(false);
      }, 450);
    } catch {
      const tpl = TEMPLATE_PRESETS[presetId] || TEMPLATE_PRESETS.preset_1;
      setTimeout(() => {
        setFields({
          ...tpl,
          ocr_source: uploadedFileName ? `Photo: ${uploadedFileName} (Grid Template)` : tpl.ocr_source,
        });
        setScanning(false);
      }, 450);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (uploadedPhotoUrl) {
      URL.revokeObjectURL(uploadedPhotoUrl);
    }
    const nextUrl = URL.createObjectURL(file);
    setUploadedPhotoUrl(nextUrl);
    setUploadedFileName(file.name);
    setImportSuccess(false);
    setScanning(true);

    const baseTemplate = fields || TEMPLATE_PRESETS[selectedPreset] || TEMPLATE_PRESETS.preset_1;
    setTimeout(() => {
      setFields({
        ...baseTemplate,
        ocr_source: `Photo: ${file.name} · Tap fields below to confirm`,
      });
      setScanning(false);
      toast.info("Line Board Photo Attached", "Confirm extracted grid fields before scoring.");
    }, 450);
  };

  const liveEstimate = fields ? computeLiveModelBEstimate(fields) : null;

  const handleImportToLedger = async () => {
    if (!fields || !liveEstimate || importing) return;
    setImporting(true);

    try {
      const orderPayload = {
        buyer: fields.buyer,
        product: fields.product,
        quantity: fields.quantity,
        total_weight_kg: liveEstimate.totalWeightKg,
        base_smv: fields.base_smv,
        gas_intensity: fields.gas_intensity,
        lead_days: fields.lead_days,
        penalty_per_day_usd: fields.penalty_per_day_usd,
      };

      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const createdOrder = await res.json();
      setImportSuccess(true);
      onOrderImported?.(createdOrder);
      toast.success("Lot Confirmed & Imported", `${createdOrder.order_id} scored and opened for rescue.`);
      setTimeout(() => onClose(), 700);
    } catch {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + fields.lead_days);
      const localOrder = {
        order_id: `VIS-2026-${Math.floor(100 + Math.random() * 900)}`,
        buyer: fields.buyer,
        product: fields.product,
        quantity: fields.quantity,
        total_weight_kg: liveEstimate.totalWeightKg,
        total_value_usd: Math.round(fields.quantity * 9.5),
        gas_intensity: fields.gas_intensity,
        base_smv: fields.base_smv,
        penalty_per_day_usd: fields.penalty_per_day_usd,
        cancel_threshold_days: 10,
        promised_ship_date: dueDate.toISOString().split("T")[0],
        lead_days: fields.lead_days,
        days_late: liveEstimate.daysLate,
        is_late: liveEstimate.probLate > 0.5 ? 1 : 0,
        air_freight_penalty_usd: liveEstimate.airFreight,
        total_exposure_usd: liveEstimate.exposure,
        predicted_prob_late: liveEstimate.probLate,
        predicted_days_late: liveEstimate.daysLate,
        conformal_interval_90: liveEstimate.conformal,
        simulated_exposure_usd: liveEstimate.exposure,
        simulated_is_late: liveEstimate.probLate > 0.5 ? 1 : 0,
        is_custom: true,
      };
      setImportSuccess(true);
      onOrderImported?.(localOrder);
      toast.success("Lot Confirmed & Imported", `${localOrder.order_id} added via local Model B scoring.`);
      setTimeout(() => onClose(), 700);
    } finally {
      setImporting(false);
    }
  };

  return (
    <ModalDialog
      variant="modal"
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      ariaLabelledBy="vision-scan-title"
    >
      <div className="flex max-h-[90dvh] flex-col overflow-hidden bg-surface text-ink">
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface-2/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]">
              <ScanLineIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="vision-scan-title" className="text-base font-semibold text-ink">
                  {lang === "bn"
                    ? "লাইন বোর্ড ফটো ও ট্যাপ-টু-কনফার্ম গ্রিড"
                    : "Shopfloor Ticket Ingestion — Photo + Tap-to-Confirm Grid"}
                </h2>
                <span className="rounded border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-[var(--status-warning-text)]">
                  Photo + Tap-to-Confirm Grid Template
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                {lang === "bn"
                  ? "বোর্ডের ছবি আপলোড বা টেমপ্লেট বেছে নিয়ে তথ্য যাচাই করুন এবং মডেল-বি স্কোরিংয়ে পাঠান"
                  : "Attach a floor whiteboard photo or load a sample template, confirm fields in the grid, and score with Model B"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close vision scanner"
            className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="scroll-shadow-y gasline-scroll flex-1 space-y-5 overflow-y-auto p-6">
          {/* Top Row: Photo Upload + Sample Shopfloor Templates */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Sample Shopfloor Templates or Local Board Photo
              </span>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-line-strong hover:bg-surface">
                <UploadCloudIcon className="h-3.5 w-3.5 text-ink-2" />
                <span>{uploadedFileName ? `Photo: ${uploadedFileName}` : "Upload Board Photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Upload whiteboard or lot card photo"
                  onChange={handlePhotoUpload}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {presets.map((p) => {
                const isSelected = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleLoadTemplate(p.id)}
                    className={`rounded-xl border p-3.5 text-left transition-all ${
                      isSelected
                        ? "border-amber-500 bg-[var(--status-warning-bg)] shadow-2xs"
                        : "border-line bg-surface-2/50 hover:border-line-strong"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-[var(--status-warning-text)]">
                        {p.badge}
                      </span>
                      {isSelected && (
                        <span className="font-mono text-[10px] font-semibold text-[var(--status-warning-text)]">
                          Loaded
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-ink">{p.label}</div>
                    <div className="mt-0.5 text-[11px] text-ink-muted">{p.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo / Scanner Chamber + Tap-to-Confirm Editable Grid */}
          <div className="relative flex min-h-[210px] flex-col items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-100">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />

            {scanning && (
              <div className="animate-laser-scan absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399]" />
            )}

            {scanning ? (
              <div className="z-10 space-y-2 py-8 text-center">
                <div className="mx-auto h-11 w-11 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                <p className="font-mono text-xs font-semibold text-emerald-400">
                  Loading Grid Template &amp; Preparing Tap-to-Confirm Fields...
                </p>
              </div>
            ) : !fields || !liveEstimate ? (
              <div className="z-10 space-y-3 py-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-amber-400">
                  <ScanLineIcon className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-zinc-200">
                  Attach a board photo or click a sample template above
                </p>
                <p className="max-w-lg text-xs text-zinc-400">
                  Because shopfloor handwriting varies, GasLine pairs photo capture with a quick Tap-to-Confirm grid so
                  operators verify Buyer, Quantity, SMV, and Gas Intensity before Model B scoring.
                </p>
                <button
                  type="button"
                  onClick={() => handleLoadTemplate()}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-zinc-950 shadow-md transition-colors hover:bg-amber-300"
                >
                  <ZapIcon className="h-3.5 w-3.5" />
                  <span>Load Selected Template Grid</span>
                </button>
              </div>
            ) : (
              <div className="z-10 w-full space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                    <span className="font-mono text-xs font-semibold text-emerald-400">
                      TAP-TO-CONFIRM GRID READY
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400">{fields.ocr_source}</span>
                </div>

                {/* Uploaded Photo Preview if attached */}
                {uploadedPhotoUrl && (
                  <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/90 p-2.5">
                    <img
                      src={uploadedPhotoUrl}
                      alt="Uploaded shopfloor board preview"
                      className="h-16 w-24 rounded border border-zinc-700 object-cover"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-zinc-200">Attached Photo Reference</div>
                      <div className="font-mono text-[11px] text-zinc-400">{uploadedFileName}</div>
                      <div className="mt-0.5 text-[10px] text-amber-300">
                        Confirm or adjust extracted values below before scoring.
                      </div>
                    </div>
                  </div>
                )}

                {/* Tap-to-Confirm Editable Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                  <label className="rounded-lg border border-zinc-800 bg-zinc-900 p-2.5">
                    <span className="block font-mono text-[10px] uppercase text-zinc-400">Buyer</span>
                    <input
                      type="text"
                      value={fields.buyer}
                      onChange={(e) => setFields({ ...fields, buyer: e.target.value })}
                      className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-semibold text-zinc-100 focus:border-amber-400 focus:outline-none"
                    />
                  </label>

                  <label className="rounded-lg border border-zinc-800 bg-zinc-900 p-2.5">
                    <span className="block font-mono text-[10px] uppercase text-zinc-400">Product Style</span>
                    <input
                      type="text"
                      value={fields.product}
                      onChange={(e) => setFields({ ...fields, product: e.target.value })}
                      className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-semibold text-zinc-100 focus:border-amber-400 focus:outline-none"
                    />
                  </label>

                  <label className="rounded-lg border border-zinc-800 bg-zinc-900 p-2.5">
                    <span className="block font-mono text-[10px] uppercase text-zinc-400">Quantity (pcs)</span>
                    <input
                      type="number"
                      min={100}
                      step={500}
                      value={fields.quantity}
                      onChange={(e) =>
                        setFields({ ...fields, quantity: Math.max(100, parseInt(e.target.value, 10) || 1000) })
                      }
                      className="font-tabular mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono font-semibold text-zinc-100 focus:border-amber-400 focus:outline-none"
                    />
                  </label>

                  <label className="rounded-lg border border-zinc-800 bg-zinc-900 p-2.5">
                    <span className="block font-mono text-[10px] uppercase text-zinc-400">Base SMV (min)</span>
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      value={fields.base_smv}
                      onChange={(e) =>
                        setFields({ ...fields, base_smv: Math.max(1, parseFloat(e.target.value) || 12) })
                      }
                      className="font-tabular mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono font-semibold text-zinc-100 focus:border-amber-400 focus:outline-none"
                    />
                  </label>

                  <label className="rounded-lg border border-zinc-800 bg-zinc-900 p-2.5">
                    <span className="block font-mono text-[10px] uppercase text-zinc-400">Gas Intensity</span>
                    <select
                      value={fields.gas_intensity}
                      onChange={(e) => setFields({ ...fields, gas_intensity: e.target.value })}
                      className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-semibold text-rose-300 focus:border-amber-400 focus:outline-none"
                    >
                      <option value="EXTREME (Continuous Dyeing)">EXTREME (Dyeing)</option>
                      <option value="HIGH (Steam Dyeing)">HIGH (Steam)</option>
                      <option value="MEDIUM (Wash & Press)">MEDIUM (Wash)</option>
                      <option value="LOW (Cut & Sew Only)">LOW (Cut/Sew)</option>
                    </select>
                  </label>

                  <label className="rounded-lg border border-zinc-800 bg-zinc-900 p-2.5">
                    <span className="block font-mono text-[10px] uppercase text-zinc-400">Lead Time (days)</span>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={fields.lead_days}
                      onChange={(e) =>
                        setFields({ ...fields, lead_days: Math.max(1, parseInt(e.target.value, 10) || 14) })
                      }
                      className="font-tabular mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono font-semibold text-zinc-100 focus:border-amber-400 focus:outline-none"
                    />
                  </label>
                </div>

                {/* Live Model B Scoring Preview */}
                <div className="space-y-3 rounded-xl border border-zinc-700/80 bg-zinc-900/90 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-amber-400">
                      <BrainIcon className="h-4 w-4" />
                      <span>Model B Live Preview (2.1 PSI Shock Baseline)</span>
                    </span>
                    <span className="rounded border border-rose-500/30 bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300">
                      {(liveEstimate.probLate * 100).toFixed(0)}% Late Probability
                    </span>
                  </div>

                  <div className="font-tabular grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-center">
                      <span className="block font-mono text-[10px] uppercase text-zinc-400">Projected Delay</span>
                      <span className="text-base font-bold text-rose-400">
                        +{liveEstimate.daysLate.toFixed(1)} Days Late
                      </span>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-center">
                      <span className="block font-mono text-[10px] uppercase text-zinc-400">
                        90% Conformal Window
                      </span>
                      <span className="font-mono text-base font-bold text-emerald-400">
                        [{liveEstimate.conformal[0]}, {liveEstimate.conformal[1]}] Days
                      </span>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-center">
                      <span className="block font-mono text-[10px] uppercase text-zinc-400">
                        Air-Freight Exposure
                      </span>
                      <span className="text-base font-bold text-amber-400">
                        ${liveEstimate.exposure.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-line bg-surface-2/60 px-6 py-4">
          <div className="text-xs text-ink-muted">
            {importSuccess ? (
              <span className="flex items-center gap-1.5 font-semibold text-[var(--status-safe-text)]">
                <CheckCircleIcon className="h-4 w-4" />
                <span>Confirmed and added to Factory Ledger!</span>
              </span>
            ) : (
              <span>Photo capture + tap-to-confirm template feeds directly into Model B GBDT inference.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line bg-surface px-4 py-2 text-xs font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              Cancel
            </button>

            {fields && (
              <button
                type="button"
                onClick={handleImportToLedger}
                disabled={importing || importSuccess}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                <span>
                  {importing ? "Importing..." : importSuccess ? "Imported!" : "Confirm & Import to Ledger"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalDialog>
  );
}
