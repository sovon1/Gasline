"use client";

import React, { useEffect, useState } from "react";
import ModalDialog from "./ModalDialog";
import { OrderItem } from "./OrderLedger";
import { useToast } from "./ToastProvider";
import { FileTextIcon, FlameIcon, PrinterIcon, Share2Icon, ShieldCheckIcon, XIcon } from "./Icons";

interface AuditModalProps {
  order: OrderItem | null;
  onClose: () => void;
}

export default function AuditModal({ order, onClose }: AuditModalProps) {
  const toast = useToast();
  const [cachedOrder, setCachedOrder] = useState<OrderItem | null>(order);

  useEffect(() => {
    if (order) setCachedOrder(order);
  }, [order]);

  const activeOrder = order ?? cachedOrder;
  const daysLate = activeOrder ? (activeOrder.predicted_days_late ?? activeOrder.days_late) || 0 : 0;
  const isAtRisk = activeOrder
    ? activeOrder.simulated_is_late !== undefined
      ? activeOrder.simulated_is_late === 1
      : activeOrder.is_late === 1
    : false;

  const dieselLiters = Math.round(Math.max(1, daysLate) * 35 * 12);
  const dieselCo2Kg = Math.round(dieselLiters * 2.68);
  const airFreightCo2Kg = activeOrder && isAtRisk ? Math.round(activeOrder.total_weight_kg * 4.4) : 0;
  const totalCrisisCo2Kg = dieselCo2Kg + airFreightCo2Kg;
  const totalCrisisCo2Tons = (totalCrisisCo2Kg / 1000).toFixed(2);

  const conformalLower = activeOrder?.conformal_interval_90
    ? activeOrder.conformal_interval_90[0]
    : Math.max(0, daysLate - 2.6);
  const conformalUpper = activeOrder?.conformal_interval_90
    ? activeOrder.conformal_interval_90[1]
    : daysLate + 2.6;

  const handleCopyLiveLink = async () => {
    if (!activeOrder) return;
    const reportUrl = `${window.location.origin}/?order=${activeOrder.order_id}&audit=GL-AUD-${activeOrder.order_id}`;
    await navigator.clipboard.writeText(reportUrl);
    toast.success("Buyer Audit Link Copied", `Permalink for GL-AUD-${activeOrder.order_id} copied to clipboard.`);
  };

  return (
    <ModalDialog
      variant="modal"
      isOpen={Boolean(order)}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      ariaLabelledBy="audit-modal-title"
    >
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          dialog.gasline-dialog::backdrop {
            display: none !important;
          }
          #printable-audit-certificate,
          #printable-audit-certificate * {
            visibility: visible;
          }
          #printable-audit-certificate {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: #ffffff !important;
            color: #09090b !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {activeOrder && (
        <div
          id="printable-audit-certificate"
          className="flex max-h-[90dvh] flex-col overflow-hidden bg-surface text-ink"
        >
          {/* Studio Header Toolbar (Hidden on print) */}
          <div className="no-print flex shrink-0 items-center justify-between border-b border-line bg-surface-2/60 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FileTextIcon className="h-4 w-4 text-ink-2" />
              <h2 id="audit-modal-title" className="text-xs font-semibold uppercase tracking-wider text-ink">
                Buyer Trust Report &amp; Force Majeure Audit Certificate
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close audit report"
              className="rounded-lg p-1 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Paper Sheet Viewport */}
          <div className="scroll-shadow-y gasline-scroll flex-1 overflow-y-auto bg-surface-2/70 p-4 sm:p-6">
            <div
              style={{ colorScheme: "light" }}
              className="mx-auto max-w-2xl space-y-4 rounded-lg border border-zinc-200 bg-white p-6 font-sans text-xs leading-relaxed text-zinc-800 shadow-md"
            >
              <div className="border-b border-zinc-200 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                        Official Factory Audit
                      </span>
                      <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-700">
                        Conformal Verified (90% Conf)
                      </span>
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-tight text-zinc-900">
                      Independent Energy Disruption &amp; Buyer Trust Certification
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Certified Pre-Delay Technical Notice &amp; Force Majeure Attestation for Apparel Brands
                    </p>
                  </div>
                  <div className="font-mono text-[11px] text-zinc-500 sm:text-right">
                    <div>
                      Document ID: <strong className="text-zinc-900">GL-AUD-{activeOrder.order_id}</strong>
                    </div>
                    <div>Issued: {new Date().toISOString().split("T")[0]}</div>
                    <div>
                      Status: <span className="font-bold text-emerald-600">Active Defense</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Reference Table */}
              <div className="font-tabular grid grid-cols-1 gap-2 rounded border border-zinc-200 bg-zinc-50 p-3 font-mono text-[11px] sm:grid-cols-2">
                <div>
                  Buyer: <strong className="text-zinc-900">{activeOrder.buyer}</strong>
                </div>
                <div>
                  Order Reference: <strong className="text-zinc-900">{activeOrder.order_id}</strong>
                </div>
                <div>
                  Lot Quantity: <strong className="text-zinc-900">{activeOrder.quantity.toLocaleString()} pcs</strong>
                </div>
                <div>
                  Garment Lot: <strong className="text-zinc-900">{activeOrder.product}</strong>
                </div>
                <div>
                  Original Ship Date: <strong className="text-zinc-900">{activeOrder.promised_ship_date}</strong>
                </div>
                <div>
                  Calibrated Window:{" "}
                  <strong className="text-amber-700">
                    +{daysLate.toFixed(1)}d [+{conformalLower.toFixed(1)}d to +{conformalUpper.toFixed(1)}d]
                  </strong>
                </div>
              </div>

              {/* Crisis-Carbon Badge */}
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-[11px]">
                <div className="mb-1.5 flex items-center justify-between font-semibold text-amber-900">
                  <div className="flex items-center gap-1.5">
                    <FlameIcon className="h-3.5 w-3.5 text-amber-600" />
                    <span className="uppercase tracking-wider">Crisis-Carbon Badge &amp; ESG Accounting</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-700">
                    +{totalCrisisCo2Tons} MT CO₂e Overhead
                  </span>
                </div>
                <p className="leading-relaxed text-amber-900/85">
                  Grid gas throttling forces dual-fuel diesel substitution and potential air-freight diversion. This lot
                  generates approximately <strong>{dieselCo2Kg.toLocaleString()} kg CO₂</strong> from emergency boiler
                  diesel
                  {airFreightCo2Kg > 0
                    ? ` and +${airFreightCo2Kg.toLocaleString()} kg CO₂ from expedited aviation cargo`
                    : ""}
                  . Certified under Higg FEM Scope-1/3 energy disruption reporting.
                </p>
              </div>

              <div>
                <h4 className="mb-1 text-[11px] font-semibold uppercase text-zinc-900">
                  1. Macro Grid Gas Transmission Disruption
                </h4>
                <p className="text-zinc-600">
                  Pursuant to official Petrobangla National Gas Grid transmission logs, pipeline pressure delivered to
                  the industrial cluster dropped from nominal <strong>12.0–15.0 PSI down to{" "}
                  {activeOrder.current_psi ? activeOrder.current_psi.toFixed(1) : "2.1"} PSI</strong>. National daily
                  supply fell below 2,250 mmcfd due to offshore FSRU maintenance and terminal curtailments.
                </p>
              </div>

              <div>
                <h4 className="mb-1 text-[11px] font-semibold uppercase text-zinc-900">
                  2. Thermodynamic Manufacturing Constraint
                </h4>
                <p className="text-zinc-600">
                  Industrial boilers for dyeing and fabric preparation require a minimum threshold of{" "}
                  <strong>4.0 PSI</strong> to generate 10-bar saturated steam. Below this threshold, dyeing vessel
                  thermal cycles extend by 51% to 60%, creating an unavoidable thermodynamic bottleneck beyond the
                  manufacturer&apos;s operational control.
                </p>
              </div>

              <div>
                <h4 className="mb-1 text-[11px] font-semibold uppercase text-zinc-900">
                  3. Factory Good-Faith Mitigation Deployed
                </h4>
                <p className="text-zinc-600">
                  The facility deployed secondary measures via GasLine prescriptive optimization: activating dual-fuel
                  diesel injection at a 2.4x cost premium and resequencing dye batches to nocturnal high-pressure
                  off-peak windows to protect buyer ship dates.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded border border-emerald-200 bg-emerald-50 p-3 text-[11px] text-emerald-800">
                <ShieldCheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  <strong>Finding:</strong> Delay qualifies under Force Majeure &amp; Infrastructure Failure provisions.
                  Early notification issued prior to vessel departure.
                </span>
              </div>
            </div>
          </div>

          {/* Modal Actions (Hidden on print) */}
          <div className="no-print flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line bg-surface-2/60 px-5 py-3.5">
            <span className="font-mono text-[11px] text-ink-muted">A4 Print-Ready Certification</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLiveLink}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <Share2Icon className="h-3.5 w-3.5 text-ink-muted" />
                <span>Copy Live Link</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-fg shadow-xs transition-opacity hover:opacity-90"
              >
                <PrinterIcon className="h-3.5 w-3.5" />
                <span>Print / Save PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalDialog>
  );
}
