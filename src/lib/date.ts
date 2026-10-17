/**
 * Local-first app: "today" means the user's local calendar day, not UTC.
 * Returns an ISO date string (YYYY-MM-DD) in the machine's time zone.
 */
export function localTodayIso(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** True when the due date falls on or before the given local day. */
export function isDueOnOrBefore(dueDate: string, today: string): boolean {
  return dueDate <= today;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Calendar-day validity, not just shape: 2026-02-30 and 2026-13-01 are rejected.
 */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Parses an ISO date as UTC midnight, so day arithmetic never shifts by zone. */
function toUtc(iso: string): Date {
  if (!isValidIsoDate(iso)) {
    throw new Error(
      `Invalid date: ${JSON.stringify(iso)}. Expected a real calendar date as YYYY-MM-DD.`,
    );
  }
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const date = toUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

/** Monday of the week that contains the anchor (weeks start on Monday). */
export function weekStart(iso: string): string {
  const dayOfWeek = toUtc(iso).getUTCDay(); // 0 = Sunday
  const offsetFromMonday = (dayOfWeek + 6) % 7; // Monday 0 … Sunday 6
  return addDaysIso(iso, -offsetFromMonday);
}

export function weekRange(iso: string): { start: string; end: string } {
  const start = weekStart(iso);
  return { start, end: addDaysIso(start, 6) };
}

/** The seven ISO days (Monday to Sunday) of the anchor's week. */
export function weekDays(iso: string): string[] {
  const { start } = weekRange(iso);
  return Array.from({ length: 7 }, (_, index) => addDaysIso(start, index));
}
