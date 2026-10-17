/**
 * Shared shapes between the calendar page (server) and the week grid / dialog
 * (client). Kept framework-free so both sides can rely on them.
 */

export type CalendarItemKind = "event" | "task";

/**
 * A single row to render on the calendar: an event or a scheduled/unscheduled
 * task, placed on its effective calendar day.
 */
export interface CalendarItem {
  /** Stable identity: `${kind}-${id}`. */
  key: string;
  kind: CalendarItemKind;
  id: number;
  title: string;
  notes: string;
  /** Effective calendar day (event.date, or task scheduleDate ?? dueDate). */
  date: string;
  /**
   * True when the item belongs to the all-day band. Events are all-day when
   * they have no start time; tasks are all-day when they have a schedule date
   * (or fall back to their due date) but no time window.
   */
  allDay: boolean;
  /** HH:MM 24h, local. Null for all-day items. */
  startTime: string | null;
  endTime: string | null;
}