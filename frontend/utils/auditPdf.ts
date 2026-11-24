export interface AuditReportPayload {
  orderId: string;
  buyer: string;
  product: string;
  quantity: number;
  promisedShipDate: string;
  issuedDate: string;
  currentPsi: number;
  daysLate: number;
  conformalLower: number;
  conformalUpper: number;
  dieselCo2Kg: number;
  airFreightCo2Kg: number;
  totalCrisisCo2Tons: string;
}

export interface QuotePdfTier {
  confidence_pct: number;
  label: string;
  lead_days: number;
  ship_date: string;
  conformal_buffer_days: number;
}

export interface QuotePdfRescueOption {
  plan_name: string;
  rescued_safe_90_days: number;
  rescued_safe_90_date: string;
  meets_buyer_date: boolean;
  expected_cost_usd: number;
  cost_range_usd: [number, number];
  unit_fob_addon_usd: number;
  honest_badge: string;
}

export interface QuotePdfPayload {
  buyer: string;
  product: string;
  quantity: number;
  totalWeightKg: number;
  baseSmv: number;
  gasIntensity: string;
  fobUnitPriceUsd: number;
  orderValueUsd: number;
  orderStartDate: string;
  zoneName: string;
  currentPsi: number;
  shockMode: "confirmed" | "unconfirmed";
  portBufferDays: number;
  wipQueueDays: number;
  requestedShipDate: string;
  requestedLeadDays: number;
  onTimeConfidencePct: number;
  totalExposureUsd: number;
  verdictLabel: string;
  isSafeToAccept: boolean;
  tiers: {
    floor_50: QuotePdfTier;
    commercial_85: QuotePdfTier;
    recommended_90: QuotePdfTier;
    bulletproof_97: QuotePdfTier;
  };
  rescueOptions: QuotePdfRescueOption[];
  cheapestViableRescue: QuotePdfRescueOption | null;
  generatedDate: string;
}

type PdfFont = "F1" | "F2" | "F3" | "F4"; // F1=Helv, F2=Helv-Bold, F3=Courier, F4=Courier-Bold
type Rgb = [number, number, number];

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 44;
const CONTENT_W = PAGE_W - MARGIN_X * 2; // 507.28 pt

function toPdfAscii(text: string): string {
  return text
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2082/g, "2")
    .replace(/\u00b7/g, "|")
    .replace(/[^\x20-\x7E]/g, " ");
}

function escapePdfString(text: string): string {
  return toPdfAscii(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = toPdfAscii(text).trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= maxChars) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function createPdfCanvas() {
  const ops: string[] = [];
  const push = (cmd: string) => ops.push(cmd);
  const setFillRgb = (r: number, g: number, b: number) =>
    push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
  const setStrokeRgb = (r: number, g: number, b: number) =>
    push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);

  const drawRect = (
    x: number,
    yTop: number,
    w: number,
    h: number,
    fill?: Rgb,
    stroke?: Rgb,
    lineWidth = 0.75
  ) => {
    const yBottom = PAGE_H - yTop - h;
    push("q");
    if (fill) setFillRgb(fill[0], fill[1], fill[2]);
    if (stroke) {
      setStrokeRgb(stroke[0], stroke[1], stroke[2]);
      push(`${lineWidth} w`);
    }
    push(`${x.toFixed(2)} ${yBottom.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    if (fill && stroke) push("B");
    else if (fill) push("f");
    else if (stroke) push("S");
    push("Q");
  };

  const drawLine = (x1: number, y1Top: number, x2: number, y2Top: number, rgb: Rgb, w = 0.75) => {
    push("q");
    setStrokeRgb(rgb[0], rgb[1], rgb[2]);
    push(`${w} w`);
    push(`${x1.toFixed(2)} ${(PAGE_H - y1Top).toFixed(2)} m ${x2.toFixed(2)} ${(PAGE_H - y2Top).toFixed(2)} l S`);
    push("Q");
  };

  const drawText = (
    text: string,
    x: number,
    yTop: number,
    font: PdfFont,
    size: number,
    rgb: Rgb = [0.09, 0.09, 0.11],
    align: "left" | "right" = "left"
  ) => {
    const clean = escapePdfString(text);
    const approxCharW = font === "F3" || font === "F4" ? size * 0.6 : size * 0.51;
    const tx = align === "right" ? x - toPdfAscii(text).length * approxCharW : x;
    push("BT");
    push(`/${font} ${size.toFixed(1)} Tf`);
    setFillRgb(rgb[0], rgb[1], rgb[2]);
    push(`1 0 0 1 ${tx.toFixed(2)} ${(PAGE_H - yTop).toFixed(2)} Tm`);
    push(`(${clean}) Tj`);
    push("ET");
  };

  const toBytes = (): Uint8Array => {
    const streamContent = ops.join("\n");
    const encoder = new TextEncoder();
    const streamBytes = encoder.encode(streamContent);

    const objects: string[] = [
      "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
      "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R /F4 7 0 R >> >> /Contents 8 0 R >>\nendobj\n`,
      "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
      "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
      "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>\nendobj\n",
      "7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
      `8 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    ];

    const header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const chunks: Uint8Array[] = [encoder.encode(header)];
    let offset = chunks[0].length;
    const offsets: number[] = [0];

    for (const obj of objects) {
      offsets.push(offset);
      const objBytes = encoder.encode(obj);
      chunks.push(objBytes);
      offset += objBytes.length;
    }

    const xrefOffset = offset;
    const xrefLines = [
      `xref\n0 ${objects.length + 1}\n`,
      "0000000000 65535 f \n",
      ...offsets.slice(1).map((off) => `${String(off).padStart(10, "0")} 00000 n \n`),
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
    ];
    chunks.push(encoder.encode(xrefLines.join("")));

    const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
    const out = new Uint8Array(totalLen);
    let pos = 0;
    for (const c of chunks) {
      out.set(c, pos);
      pos += c.length;
    }
    return out;
  };

  return { drawRect, drawLine, drawText, toBytes };
}

/**
 * Generates a standalone, print-ready A4 Buyer Trust Audit PDF (595.28 x 841.89 pt).
 */
export function buildAuditPdfBytes(payload: AuditReportPayload): Uint8Array {
  const { drawRect, drawLine, drawText, toBytes } = createPdfCanvas();

  // Outer A4 Sheet Frame
  drawRect(24, 24, PAGE_W - 48, PAGE_H - 48, [1, 1, 1], [0.83, 0.85, 0.88], 1.0);

  let y = 44;

  // Top Badges
  drawRect(MARGIN_X, y, 134, 16, [0.09, 0.09, 0.11]);
  drawText("OFFICIAL FACTORY AUDIT", MARGIN_X + 7, y + 11.5, "F4", 7.5, [1, 1, 1]);

  drawRect(MARGIN_X + 142, y, 152, 16, [0.925, 0.992, 0.961], [0.655, 0.953, 0.816], 0.75);
  drawText("Conformal Verified (90% Conf)", MARGIN_X + 149, y + 11.5, "F4", 7.5, [0.016, 0.471, 0.341]);

  // Right Metadata Block
  drawText(`Document ID: GL-AUD-${payload.orderId}`, PAGE_W - MARGIN_X, y + 8, "F4", 8.5, [0.09, 0.09, 0.11], "right");
  drawText(`Issued: ${payload.issuedDate}`, PAGE_W - MARGIN_X, y + 21, "F3", 8.5, [0.35, 0.37, 0.41], "right");
  drawText("Status: Active Defense", PAGE_W - MARGIN_X, y + 34, "F4", 8.5, [0.02, 0.588, 0.412], "right");

  y += 30;
  drawText("INDEPENDENT ENERGY DISRUPTION &", MARGIN_X, y, "F2", 12.5, [0.09, 0.09, 0.11]);
  y += 15;
  drawText("BUYER TRUST CERTIFICATION", MARGIN_X, y, "F2", 12.5, [0.09, 0.09, 0.11]);
  y += 15;
  drawText(
    "Certified Pre-Delay Technical Notice & Force Majeure Attestation for Apparel Brands",
    MARGIN_X,
    y,
    "F1",
    9.0,
    [0.39, 0.41, 0.45]
  );

  y += 14;
  drawLine(MARGIN_X, y, PAGE_W - MARGIN_X, y, [0.85, 0.86, 0.89], 1.0);
  y += 14;

  // Order Reference Grid Box
  drawRect(MARGIN_X, y, CONTENT_W, 74, [0.976, 0.980, 0.984], [0.85, 0.86, 0.89], 0.75);
  const col1X = MARGIN_X + 12;
  const col2X = MARGIN_X + CONTENT_W / 2 + 6;

  drawText("Buyer:", col1X, y + 20, "F3", 8.5, [0.35, 0.37, 0.41]);
  drawText(payload.buyer, col1X + 40, y + 20, "F4", 8.5, [0.09, 0.09, 0.11]);

  drawText("Order Ref:", col2X, y + 20, "F3", 8.5, [0.35, 0.37, 0.41]);
  drawText(payload.orderId, col2X + 60, y + 20, "F4", 8.5, [0.09, 0.09, 0.11]);

  drawText("Lot Quantity:", col1X, y + 40, "F3", 8.5, [0.35, 0.37, 0.41]);
  drawText(`${payload.quantity.toLocaleString()} pcs`, col1X + 74, y + 40, "F4", 8.5, [0.09, 0.09, 0.11]);

  drawText("Garment Lot:", col2X, y + 40, "F3", 8.5, [0.35, 0.37, 0.41]);
  drawText(payload.product, col2X + 72, y + 40, "F4", 8.5, [0.09, 0.09, 0.11]);

  drawText("Orig Ship Date:", col1X, y + 60, "F3", 8.5, [0.35, 0.37, 0.41]);
  drawText(payload.promisedShipDate, col1X + 86, y + 60, "F4", 8.5, [0.09, 0.09, 0.11]);

  drawText("Calibrated Window:", col2X, y + 60, "F3", 8.5, [0.35, 0.37, 0.41]);
  drawText(
    `+${payload.daysLate.toFixed(1)}d [+${payload.conformalLower.toFixed(1)}d to +${payload.conformalUpper.toFixed(1)}d]`,
    col2X + 100,
    y + 60,
    "F4",
    8.2,
    [0.706, 0.325, 0.035]
  );

  y += 92;

  // Crisis-Carbon Badge & ESG Accounting Box
  const esgParagraph =
    `Grid gas throttling forces dual-fuel diesel substitution and potential air-freight diversion. This lot generates approximately ${payload.dieselCo2Kg.toLocaleString()} kg CO2 from emergency boiler diesel` +
    (payload.airFreightCo2Kg > 0
      ? ` and +${payload.airFreightCo2Kg.toLocaleString()} kg CO2 from expedited aviation cargo`
      : "") +
    ". Certified under Higg FEM Scope-1/3 energy disruption reporting.";
  const esgLines = wrapText(esgParagraph, 88);
  const esgBoxH = 34 + esgLines.length * 13;

  drawRect(MARGIN_X, y, CONTENT_W, esgBoxH, [1.0, 0.984, 0.922], [0.988, 0.827, 0.302], 0.85);
  drawText("CRISIS-CARBON BADGE & ESG ACCOUNTING", MARGIN_X + 12, y + 18, "F2", 8.8, [0.471, 0.208, 0.059]);
  drawText(
    `+${payload.totalCrisisCo2Tons} MT CO2e Overhead`,
    PAGE_W - MARGIN_X - 12,
    y + 18,
    "F4",
    9.0,
    [0.706, 0.325, 0.035],
    "right"
  );
  let esgY = y + 34;
  for (const line of esgLines) {
    drawText(line, MARGIN_X + 12, esgY, "F1", 8.8, [0.471, 0.208, 0.059]);
    esgY += 13;
  }

  y += esgBoxH + 22;

  // Numbered Technical Sections
  const sections: Array<{ heading: string; body: string }> = [
    {
      heading: "1. MACRO GRID GAS TRANSMISSION DISRUPTION",
      body: `Pursuant to official Petrobangla National Gas Grid transmission logs, pipeline pressure delivered to the industrial cluster dropped from nominal 12.0-15.0 PSI down to ${payload.currentPsi.toFixed(1)} PSI. National daily supply fell below 2,250 mmcfd due to offshore FSRU maintenance and terminal curtailments.`,
    },
    {
      heading: "2. THERMODYNAMIC MANUFACTURING CONSTRAINT",
      body: "Industrial boilers for dyeing and fabric preparation require a minimum threshold of 4.0 PSI to generate 10-bar saturated steam. Below this threshold, dyeing vessel thermal cycles extend by 51% to 60%, creating an unavoidable thermodynamic bottleneck beyond the manufacturer's operational control.",
    },
    {
      heading: "3. FACTORY GOOD-FAITH MITIGATION DEPLOYED",
      body: "The facility deployed secondary measures via GasLine prescriptive optimization: activating dual-fuel diesel injection at a 2.4x cost premium and resequencing dye batches to nocturnal high-pressure off-peak windows to protect buyer ship dates.",
    },
  ];

  for (const sec of sections) {
    drawText(sec.heading, MARGIN_X, y, "F2", 9.5, [0.09, 0.09, 0.11]);
    y += 15;
    const lines = wrapText(sec.body, 90);
    for (const line of lines) {
      drawText(line, MARGIN_X, y, "F1", 9.3, [0.32, 0.34, 0.38]);
      y += 14;
    }
    y += 12;
  }

  // Finding Box
  const findingLines = wrapText(
    "Finding: Delay qualifies under Force Majeure & Infrastructure Failure provisions. Early notification issued prior to vessel departure.",
    86
  );
  const findingH = 18 + findingLines.length * 13;
  drawRect(MARGIN_X, y, CONTENT_W, findingH, [0.925, 0.992, 0.961], [0.655, 0.953, 0.816], 0.85);
  let fY = y + 17;
  for (const line of findingLines) {
    drawText(line, MARGIN_X + 12, fY, "F2", 9.0, [0.024, 0.373, 0.275]);
    fY += 13;
  }

  y += findingH + 34;

  // Signature / Verification Strip
  drawLine(MARGIN_X, y, MARGIN_X + 185, y, [0.25, 0.27, 0.30], 0.75);
  drawText("Plant Operations & Energy Cell", MARGIN_X, y + 12, "F2", 8.2, [0.22, 0.24, 0.28]);
  drawText("GasLine Conformal Audit Engine", MARGIN_X, y + 23, "F1", 7.8, [0.45, 0.47, 0.52]);

  drawLine(PAGE_W - MARGIN_X - 185, y, PAGE_W - MARGIN_X, y, [0.25, 0.27, 0.30], 0.75);
  drawText(`Ref: GL-AUD-${payload.orderId}`, PAGE_W - MARGIN_X, y + 12, "F4", 8.2, [0.22, 0.24, 0.28], "right");
  drawText(`Generated ${payload.issuedDate} | A4 Verified`, PAGE_W - MARGIN_X, y + 23, "F3", 7.8, [0.45, 0.47, 0.52], "right");

  // Footer
  drawLine(MARGIN_X, PAGE_H - 58, PAGE_W - MARGIN_X, PAGE_H - 58, [0.88, 0.89, 0.91], 0.6);
  drawText(
    "GasLine Industrial Energy Telemetry | Pre-Delay Buyer Trust & Crisis-Carbon Certificate (Higg FEM Scope-1/3)",
    MARGIN_X,
    PAGE_H - 44,
    "F1",
    7.6,
    [0.48, 0.50, 0.55]
  );

  return toBytes();
}

/**
 * Generates a standalone, print-ready A4 Pre-PO Ship-Date & FOB Rescue Quotation PDF.
 */
export function buildQuotePdfBytes(payload: QuotePdfPayload): Uint8Array {
  const { drawRect, drawLine, drawText, toBytes } = createPdfCanvas();
  const safeRef = `GL-QTE-${payload.buyer.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || "PO"}-${payload.requestedLeadDays}D`;

  // Outer A4 Frame
  drawRect(24, 24, PAGE_W - 48, PAGE_H - 48, [1, 1, 1], [0.83, 0.85, 0.88], 1.0);

  let y = 44;

  // Header Badges
  drawRect(MARGIN_X, y, 146, 16, [0.09, 0.09, 0.11]);
  drawText("PRE-PO QUOTE PROMISE SHEET", MARGIN_X + 7, y + 11.5, "F4", 7.3, [1, 1, 1]);

  if (payload.shockMode === "unconfirmed") {
    drawRect(MARGIN_X + 154, y, 162, 16, [1.0, 0.984, 0.922], [0.988, 0.827, 0.302], 0.75);
    drawText("Unconfirmed Shock Envelope", MARGIN_X + 161, y + 11.5, "F4", 7.3, [0.706, 0.325, 0.035]);
  } else {
    drawRect(MARGIN_X + 154, y, 150, 16, [0.925, 0.992, 0.961], [0.655, 0.953, 0.816], 0.75);
    drawText("Conformal Calibrated (90%)", MARGIN_X + 161, y + 11.5, "F4", 7.3, [0.016, 0.471, 0.341]);
  }

  // Right Metadata
  drawText(`Quote Ref: ${safeRef}`, PAGE_W - MARGIN_X, y + 8, "F4", 8.2, [0.09, 0.09, 0.11], "right");
  drawText(`Issued: ${payload.generatedDate}`, PAGE_W - MARGIN_X, y + 20, "F3", 8.2, [0.35, 0.37, 0.41], "right");
  drawText(`${payload.zoneName.split(" ")[0]} (${payload.currentPsi.toFixed(1)} PSI)`, PAGE_W - MARGIN_X, y + 32, "F4", 8.2, [0.706, 0.325, 0.035], "right");

  y += 30;
  drawText("PRE-PO SHIP-DATE & FOB RESCUE QUOTATION", MARGIN_X, y, "F2", 12.5, [0.09, 0.09, 0.11]);
  y += 14;
  drawText(
    "Model A/B Thermodynamic Lead-Time Forecast, Conformal Risk Tiers & Air-Freight Hedge",
    MARGIN_X,
    y,
    "F1",
    8.8,
    [0.39, 0.41, 0.45]
  );

  y += 12;
  drawLine(MARGIN_X, y, PAGE_W - MARGIN_X, y, [0.85, 0.86, 0.89], 1.0);
  y += 12;

  // Order Spec Box
  drawRect(MARGIN_X, y, CONTENT_W, 74, [0.976, 0.980, 0.984], [0.85, 0.86, 0.89], 0.75);
  const col1X = MARGIN_X + 12;
  const col2X = MARGIN_X + CONTENT_W / 2 + 6;

  drawText("Buyer:", col1X, y + 19, "F3", 8.3, [0.35, 0.37, 0.41]);
  drawText(payload.buyer, col1X + 40, y + 19, "F4", 8.3, [0.09, 0.09, 0.11]);

  drawText("Style / Gas:", col2X, y + 19, "F3", 8.3, [0.35, 0.37, 0.41]);
  drawText(`${payload.product} (${payload.gasIntensity})`, col2X + 68, y + 19, "F4", 8.3, [0.09, 0.09, 0.11]);

  drawText("Lot Size:", col1X, y + 39, "F3", 8.3, [0.35, 0.37, 0.41]);
  drawText(`${payload.quantity.toLocaleString()} pcs (${payload.totalWeightKg.toLocaleString()} kg)`, col1X + 54, y + 39, "F4", 8.3, [0.09, 0.09, 0.11]);

  drawText("FOB Value:", col2X, y + 39, "F3", 8.3, [0.35, 0.37, 0.41]);
  drawText(`$${payload.fobUnitPriceUsd.toFixed(2)}/pc ($${payload.orderValueUsd.toLocaleString()})`, col2X + 60, y + 39, "F4", 8.3, [0.09, 0.09, 0.11]);

  drawText("Quote Date:", col1X, y + 59, "F3", 8.3, [0.35, 0.37, 0.41]);
  drawText(`${payload.orderStartDate} (SMV ${payload.baseSmv.toFixed(1)}m)`, col1X + 64, y + 59, "F4", 8.3, [0.09, 0.09, 0.11]);

  drawText("Port / WIP:", col2X, y + 59, "F3", 8.3, [0.35, 0.37, 0.41]);
  drawText(`+${payload.portBufferDays.toFixed(1)}d CPA | +${payload.wipQueueDays.toFixed(1)}d WIP`, col2X + 66, y + 59, "F4", 8.3, [0.09, 0.09, 0.11]);

  y += 88;

  // Buyer Request Evaluation Banner
  const verdictFill: Rgb = payload.isSafeToAccept ? [0.925, 0.992, 0.961] : [1.0, 0.984, 0.922];
  const verdictStroke: Rgb = payload.isSafeToAccept ? [0.655, 0.953, 0.816] : [0.988, 0.827, 0.302];
  const verdictInk: Rgb = payload.isSafeToAccept ? [0.024, 0.373, 0.275] : [0.573, 0.251, 0.055];

  drawRect(MARGIN_X, y, CONTENT_W, 42, verdictFill, verdictStroke, 0.85);
  drawText(`BUYER TARGET: ${payload.requestedShipDate} (${payload.requestedLeadDays}d) - ${payload.verdictLabel}`, MARGIN_X + 12, y + 17, "F2", 8.8, verdictInk);
  drawText(
    `On-Time Confidence: ${payload.onTimeConfidencePct.toFixed(1)}%   |   Unhedged Air-Freight & Delay Exposure: $${payload.totalExposureUsd.toLocaleString()} USD`,
    MARGIN_X + 12,
    y + 32,
    "F1",
    8.4,
    verdictInk
  );

  y += 58;

  // Section 1: 4 Promise Confidence Tiers
  drawText("1. CONFORMAL SHIP-DATE PROMISE TIERS", MARGIN_X, y, "F2", 9.3, [0.09, 0.09, 0.11]);
  y += 10;

  drawRect(MARGIN_X, y, CONTENT_W, 20, [0.945, 0.953, 0.965], [0.85, 0.86, 0.89], 0.6);
  drawText("CONFIDENCE TIER", MARGIN_X + 10, y + 13, "F4", 7.4, [0.35, 0.37, 0.41]);
  drawText("PROMISED DATE", MARGIN_X + 235, y + 13, "F4", 7.4, [0.35, 0.37, 0.41]);
  drawText("LEAD DAYS", MARGIN_X + 350, y + 13, "F4", 7.4, [0.35, 0.37, 0.41]);
  drawText("CONFORMAL BUFFER", PAGE_W - MARGIN_X - 10, y + 13, "F4", 7.4, [0.35, 0.37, 0.41], "right");
  y += 20;

  const tierRows: Array<{ tier: QuotePdfTier; highlight?: boolean }> = [
    { tier: payload.tiers.floor_50 },
    { tier: payload.tiers.commercial_85 },
    { tier: payload.tiers.recommended_90, highlight: true },
    { tier: payload.tiers.bulletproof_97 },
  ];

  for (const row of tierRows) {
    const rowFill: Rgb = row.highlight ? [0.925, 0.992, 0.961] : [1, 1, 1];
    const textInk: Rgb = row.highlight ? [0.016, 0.471, 0.341] : [0.15, 0.17, 0.20];
    drawRect(MARGIN_X, y, CONTENT_W, 22, rowFill, [0.88, 0.89, 0.91], 0.5);
    drawText(`${row.tier.confidence_pct}% - ${row.tier.label}`, MARGIN_X + 10, y + 14.5, row.highlight ? "F2" : "F1", 8.2, textInk);
    drawText(row.tier.ship_date, MARGIN_X + 235, y + 14.5, "F4", 8.2, textInk);
    drawText(`${row.tier.lead_days} days`, MARGIN_X + 350, y + 14.5, "F3", 8.2, textInk);
    drawText(
      row.tier.conformal_buffer_days > 0 ? `+${row.tier.conformal_buffer_days.toFixed(2)}d` : "0.00d (floor)",
      PAGE_W - MARGIN_X - 10,
      y + 14.5,
      "F3",
      8.2,
      textInk,
      "right"
    );
    y += 22;
  }

  y += 20;

  // Section 2: Pre-Signing Rescue Options Table
  drawText(`2. PRE-SIGNING RESCUE OPTIONS (TO HOLD ${payload.requestedShipDate})`, MARGIN_X, y, "F2", 9.3, [0.09, 0.09, 0.11]);
  y += 10;

  drawRect(MARGIN_X, y, CONTENT_W, 20, [0.945, 0.953, 0.965], [0.85, 0.86, 0.89], 0.6);
  drawText("INTERVENTION", MARGIN_X + 10, y + 13, "F4", 7.3, [0.35, 0.37, 0.41]);
  drawText("UNLOCKED 90% DATE", MARGIN_X + 164, y + 13, "F4", 7.3, [0.35, 0.37, 0.41]);
  drawText("TARGET?", MARGIN_X + 272, y + 13, "F4", 7.3, [0.35, 0.37, 0.41]);
  drawText("FOB ADD-ON", MARGIN_X + 324, y + 13, "F4", 7.3, [0.35, 0.37, 0.41]);
  drawText("COMMITMENT POLICY", PAGE_W - MARGIN_X - 10, y + 13, "F4", 7.3, [0.35, 0.37, 0.41], "right");
  y += 20;

  for (const opt of payload.rescueOptions.slice(0, 4)) {
    const rowFill: Rgb = opt.meets_buyer_date ? [0.985, 0.996, 0.991] : [1, 1, 1];
    drawRect(MARGIN_X, y, CONTENT_W, 28, rowFill, [0.88, 0.89, 0.91], 0.5);
    const shortName = opt.plan_name.length > 30 ? `${opt.plan_name.slice(0, 28)}..` : opt.plan_name;
    drawText(shortName, MARGIN_X + 10, y + 17, "F2", 7.8, [0.09, 0.09, 0.11]);
    drawText(`${opt.rescued_safe_90_date} (${opt.rescued_safe_90_days}d)`, MARGIN_X + 164, y + 17, "F3", 7.8, [0.24, 0.26, 0.30]);
    drawText(
      opt.meets_buyer_date ? "YES" : "Short",
      MARGIN_X + 272,
      y + 17,
      "F4",
      7.8,
      opt.meets_buyer_date ? [0.016, 0.471, 0.341] : [0.706, 0.325, 0.035]
    );
    const rangeStr =
      opt.cost_range_usd[0] !== opt.cost_range_usd[1]
        ? `$${opt.cost_range_usd[0].toLocaleString()}-$${opt.cost_range_usd[1].toLocaleString()}`
        : `$${opt.expected_cost_usd.toLocaleString()}`;
    drawText(`+$${opt.unit_fob_addon_usd.toFixed(3)}/pc`, MARGIN_X + 324, y + 13, "F4", 7.8, [0.09, 0.09, 0.11]);
    drawText(rangeStr, MARGIN_X + 324, y + 23, "F3", 7.1, [0.45, 0.47, 0.52]);
    drawText(
      opt.honest_badge,
      PAGE_W - MARGIN_X - 10,
      y + 17,
      "F1",
      7.6,
      opt.honest_badge.includes("No-Regret") ? [0.016, 0.471, 0.341] : [0.573, 0.251, 0.055],
      "right"
    );
    y += 28;
  }

  y += 22;

  // Section 3: Commercial Edge Recommendation Box
  const edgeCopy =
    payload.cheapestViableRescue && !payload.isSafeToAccept
      ? `Counter-offer ${payload.tiers.recommended_90.ship_date} (${payload.tiers.recommended_90.lead_days}d) for $0.000/pc extra cost at 90% conformal safety, OR accept buyer's ${payload.requestedShipDate} target date pre-priced with ${payload.cheapestViableRescue.plan_name} (+$${payload.cheapestViableRescue.unit_fob_addon_usd.toFixed(3)}/pc FOB add-on) to avoid $6.65/kg emergency air freight.`
      : `Buyer target date ${payload.requestedShipDate} clears the 90% conformal safety threshold under current ${payload.currentPsi.toFixed(1)} PSI conditions. Proceed with standard PO acceptance and live GasLine Model B monitoring.`;

  const edgeLines = wrapText(edgeCopy, 88);
  const edgeBoxH = 28 + edgeLines.length * 13;
  drawRect(MARGIN_X, y, CONTENT_W, edgeBoxH, [0.976, 0.980, 0.984], [0.80, 0.82, 0.86], 0.85);
  drawText("COMMERCIAL EDGE RECOMMENDATION", MARGIN_X + 12, y + 16, "F2", 8.5, [0.09, 0.09, 0.11]);
  let eY = y + 30;
  for (const line of edgeLines) {
    drawText(line, MARGIN_X + 12, eY, "F1", 8.5, [0.26, 0.28, 0.32]);
    eY += 13;
  }

  y += edgeBoxH + 34;

  // Signature Strip
  drawLine(MARGIN_X, y, MARGIN_X + 185, y, [0.25, 0.27, 0.30], 0.75);
  drawText("RMG Merchandising & Costing Desk", MARGIN_X, y + 12, "F2", 8.1, [0.22, 0.24, 0.28]);
  drawText("GasLine Pre-PO Quoting Engine", MARGIN_X, y + 23, "F1", 7.7, [0.45, 0.47, 0.52]);

  drawLine(PAGE_W - MARGIN_X - 185, y, PAGE_W - MARGIN_X, y, [0.25, 0.27, 0.30], 0.75);
  drawText(`Ref: ${safeRef}`, PAGE_W - MARGIN_X, y + 12, "F4", 8.1, [0.22, 0.24, 0.28], "right");
  drawText(`Generated ${payload.generatedDate} | A4 Verified`, PAGE_W - MARGIN_X, y + 23, "F3", 7.7, [0.45, 0.47, 0.52], "right");

  // Footer
  drawLine(MARGIN_X, PAGE_H - 58, PAGE_W - MARGIN_X, PAGE_H - 58, [0.88, 0.89, 0.91], 0.6);
  drawText(
    "GasLine RMG Energy-Shock Intelligence | Pre-Signing Lead-Time Guarantee & FOB Hedge Sheet",
    MARGIN_X,
    PAGE_H - 44,
    "F1",
    7.6,
    [0.48, 0.50, 0.55]
  );

  return toBytes();
}

export function downloadPdfBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildAuditPrintHtml(payload: AuditReportPayload): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const airText =
    payload.airFreightCo2Kg > 0
      ? ` and <strong>+${payload.airFreightCo2Kg.toLocaleString()} kg CO&#8322;</strong> from expedited aviation cargo`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>GasLine Buyer Trust Audit - GL-AUD-${esc(payload.orderId)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm 16mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { margin: 0; padding: 0; background: #ffffff; color: #18181b; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10pt; line-height: 1.5; }
  .sheet { max-width: 178mm; margin: 0 auto; border: 1px solid #d4d4d8; border-radius: 6px; padding: 24px 28px; background: #ffffff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 1px solid #e4e4e7; padding-bottom: 16px; margin-bottom: 16px; }
  .badges { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
  .badge-dark { background: #18181b; color: #ffffff; padding: 2px 7px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
  .badge-green { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 2px 7px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 7.5pt; font-weight: 600; }
  h1 { margin: 0 0 3px 0; font-size: 12pt; font-weight: 700; text-transform: uppercase; letter-spacing: -0.01em; color: #18181b; }
  .subtitle { margin: 0; font-size: 8.8pt; color: #71717a; }
  .meta-right { text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 8.5pt; color: #71717a; white-space: nowrap; line-height: 1.6; }
  .meta-right strong { color: #18181b; }
  .status-active { color: #059669; font-weight: 700; }
  .grid-box { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 4px; padding: 12px 14px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 8.5pt; margin-bottom: 16px; }
  .grid-box span { color: #52525b; }
  .grid-box strong { color: #18181b; }
  .amber-text { color: #b45309 !important; }
  .esg-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 14px; margin-bottom: 18px; }
  .esg-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-weight: 700; color: #78350f; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.04em; }
  .esg-val { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #b45309; font-size: 9.2pt; text-transform: none; }
  .esg-body { margin: 0; font-size: 8.8pt; color: #78350f; line-height: 1.5; }
  .sec { margin-bottom: 14px; }
  .sec h2 { margin: 0 0 4px 0; font-size: 8.8pt; font-weight: 700; text-transform: uppercase; color: #18181b; }
  .sec p { margin: 0; font-size: 9pt; color: #52525b; line-height: 1.55; }
  .finding { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; padding: 10px 12px; color: #065f46; font-size: 8.8pt; margin-top: 16px; }
  .sigs { display: flex; justify-content: space-between; margin-top: 34px; gap: 32px; font-size: 8pt; color: #52525b; }
  .sig-col { width: 42%; border-top: 1px solid #3f3f46; padding-top: 6px; }
  .sig-col strong { display: block; color: #18181b; }
  .footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #e4e4e7; font-size: 7.5pt; color: #71717a; text-align: center; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <div class="badges">
          <span class="badge-dark">Official Factory Audit</span>
          <span class="badge-green">Conformal Verified (90% Conf)</span>
        </div>
        <h1>Independent Energy Disruption &amp; Buyer Trust Certification</h1>
        <p class="subtitle">Certified Pre-Delay Technical Notice &amp; Force Majeure Attestation for Apparel Brands</p>
      </div>
      <div class="meta-right">
        <div>Document ID: <strong>GL-AUD-${esc(payload.orderId)}</strong></div>
        <div>Issued: ${esc(payload.issuedDate)}</div>
        <div>Status: <span class="status-active">Active Defense</span></div>
      </div>
    </div>

    <div class="grid-box">
      <div><span>Buyer:</span> <strong>${esc(payload.buyer)}</strong></div>
      <div><span>Order Reference:</span> <strong>${esc(payload.orderId)}</strong></div>
      <div><span>Lot Quantity:</span> <strong>${payload.quantity.toLocaleString()} pcs</strong></div>
      <div><span>Garment Lot:</span> <strong>${esc(payload.product)}</strong></div>
      <div><span>Original Ship Date:</span> <strong>${esc(payload.promisedShipDate)}</strong></div>
      <div><span>Calibrated Window:</span> <strong class="amber-text">+${payload.daysLate.toFixed(1)}d [+${payload.conformalLower.toFixed(1)}d to +${payload.conformalUpper.toFixed(1)}d]</strong></div>
    </div>

    <div class="esg-box">
      <div class="esg-head">
        <span>Crisis-Carbon Badge &amp; ESG Accounting</span>
        <span class="esg-val">+${esc(payload.totalCrisisCo2Tons)} MT CO&#8322;e Overhead</span>
      </div>
      <p class="esg-body">
        Grid gas throttling forces dual-fuel diesel substitution and potential air-freight diversion. This lot generates approximately
        <strong>${payload.dieselCo2Kg.toLocaleString()} kg CO&#8322;</strong> from emergency boiler diesel${airText}.
        Certified under Higg FEM Scope-1/3 energy disruption reporting.
      </p>
    </div>

    <div class="sec">
      <h2>1. Macro Grid Gas Transmission Disruption</h2>
      <p>
        Pursuant to official Petrobangla National Gas Grid transmission logs, pipeline pressure delivered to the industrial cluster dropped
        from nominal <strong>12.0–15.0 PSI down to ${payload.currentPsi.toFixed(1)} PSI</strong>. National daily supply fell below 2,250 mmcfd
        due to offshore FSRU maintenance and terminal curtailments.
      </p>
    </div>

    <div class="sec">
      <h2>2. Thermodynamic Manufacturing Constraint</h2>
      <p>
        Industrial boilers for dyeing and fabric preparation require a minimum threshold of <strong>4.0 PSI</strong> to generate 10-bar saturated steam.
        Below this threshold, dyeing vessel thermal cycles extend by 51% to 60%, creating an unavoidable thermodynamic bottleneck beyond the
        manufacturer&apos;s operational control.
      </p>
    </div>

    <div class="sec">
      <h2>3. Factory Good-Faith Mitigation Deployed</h2>
      <p>
        The facility deployed secondary measures via GasLine prescriptive optimization: activating dual-fuel diesel injection at a 2.4x cost
        premium and resequencing dye batches to nocturnal high-pressure off-peak windows to protect buyer ship dates.
      </p>
    </div>

    <div class="finding">
      <strong>Finding:</strong> Delay qualifies under Force Majeure &amp; Infrastructure Failure provisions. Early notification issued prior to vessel departure.
    </div>

    <div class="sigs">
      <div class="sig-col">
        <strong>Plant Operations &amp; Energy Cell</strong>
        GasLine Conformal Audit Engine
      </div>
      <div class="sig-col" style="text-align: right;">
        <strong>Ref: GL-AUD-${esc(payload.orderId)}</strong>
        Generated ${esc(payload.issuedDate)} · A4 Print-Ready
      </div>
    </div>

    <div class="footer">
      GasLine Industrial Energy Telemetry · Pre-Delay Buyer Trust &amp; Crisis-Carbon Certificate (Higg FEM Scope-1/3)
    </div>
  </div>
</body>
</html>`;
}
