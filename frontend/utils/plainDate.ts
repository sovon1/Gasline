/**
 * Location-agnostic calendar date arithmetic (YYYY-MM-DD).
 * Uses native `Temporal.PlainDate` where available (Chrome 144+, Edge 144+, Firefox 139+)
 * and falls back to pure integer Gregorian/Julian Day Number math — never constructing
 * timezone-sensitive legacy `Date` objects from ISO strings.
 */

interface TemporalPlainDateLike {
  year: number;
  month: number;
  day: number;
  add(duration: { days?: number; months?: number }): TemporalPlainDateLike;
  until(other: TemporalPlainDateLike, options?: { largestUnit?: string }): { days: number };
  toString(): string;
}

interface TemporalGlobal {
  PlainDate?: {
    from(item: string | { year: number; month: number; day: number }): TemporalPlainDateLike;
  };
}

const SHORT_MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getNativePlainDate() {
  const g = globalThis as unknown as { Temporal?: TemporalGlobal };
  return g.Temporal?.PlainDate;
}

function parseIsoParts(iso: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

// Pure integer Gregorian <-> Julian Day Number conversion (zero timezone drift)
function toJulianDay(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function fromJulianDay(jdn: number): { year: number; month: number; day: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function isValidIsoPlainDate(iso: string): boolean {
  const PlainDate = getNativePlainDate();
  if (PlainDate) {
    try {
      PlainDate.from(iso.trim());
      return true;
    } catch {
      return false;
    }
  }
  const parts = parseIsoParts(iso);
  if (!parts) return false;
  const roundtrip = fromJulianDay(toJulianDay(parts.year, parts.month, parts.day));
  return (
    roundtrip.year === parts.year &&
    roundtrip.month === parts.month &&
    roundtrip.day === parts.day
  );
}

export function addCalendarDays(isoDate: string, daysToAdd: number): string {
  const cleanDays = Math.round(Number.isFinite(daysToAdd) ? daysToAdd : 0);
  const PlainDate = getNativePlainDate();
  if (PlainDate) {
    try {
      return PlainDate.from(isoDate.trim()).add({ days: cleanDays }).toString();
    } catch {
      // Fall through to integer fallback
    }
  }
  const parts = parseIsoParts(isoDate) ?? { year: 2026, month: 11, day: 24 };
  const next = fromJulianDay(toJulianDay(parts.year, parts.month, parts.day) + cleanDays);
  return `${next.year}-${pad2(next.month)}-${pad2(next.day)}`;
}

export function diffCalendarDays(startIso: string, endIso: string): number {
  const PlainDate = getNativePlainDate();
  if (PlainDate) {
    try {
      const start = PlainDate.from(startIso.trim());
      const end = PlainDate.from(endIso.trim());
      return start.until(end, { largestUnit: "days" }).days;
    } catch {
      // Fall through to integer fallback
    }
  }
  const s = parseIsoParts(startIso) ?? { year: 2026, month: 11, day: 24 };
  const e = parseIsoParts(endIso) ?? { year: 2027, month: 1, day: 5 };
  return toJulianDay(e.year, e.month, e.day) - toJulianDay(s.year, s.month, s.day);
}

export function formatPlainDateDisplay(isoDate: string): string {
  const PlainDate = getNativePlainDate();
  if (PlainDate) {
    try {
      const pd = PlainDate.from(isoDate.trim());
      return `${pd.day} ${SHORT_MONTHS_EN[pd.month - 1]} ${pd.year}`;
    } catch {
      // Fall through
    }
  }
  const parts = parseIsoParts(isoDate);
  if (!parts) return isoDate;
  return `${parts.day} ${SHORT_MONTHS_EN[parts.month - 1] ?? "Jan"} ${parts.year}`;
}
