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
