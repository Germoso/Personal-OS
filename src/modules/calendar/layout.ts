/**
 * Pure layout math for the weekly time grid (Google Calendar style).
 *
 * Everything here is a pure function of its inputs — no React, no DB — so the
 * overlap algorithms are unit-testable in isolation.
 *
 * Time model (single local calendar day, no time zones by design):
 * - A timed item lives on a day and has a startTime (HH:MM 24h) and an
 *   optional endTime. The block is drawn inside the day column.
 * - Midnight crossing is supported: endTime <= startTime means the item ends
 *   the next day (e.g. 22:00 → 02:00 is 4h, 22:00 → 22:00 is 24h). Visually
 *   the block is clipped to the end of the day column by the renderer.
 * - An item without endTime defaults to a 60-minute block.
 */

export const MINUTES_PER_DAY = 24 * 60;

/** "columns" (simple): first free column scanning left to right. */
export const SIMPLE_COLUMNS = "columns";
/** "optimal": top-to-bottom packing (Google Calendar style). */
export const OPTIMAL = "optimal";

export type OverlapAlgorithm = typeof SIMPLE_COLUMNS | typeof OPTIMAL;

export interface TimedItem {
  /** Stable identity: `${kind}-${id}`. */
  key: string;
  /** Minutes from 00:00 (0..1439). */
  start: number;
  /** Duration in minutes; may cross midnight (start + duration > 1440). */
  duration: number;
}

export interface LayoutPosition {
  key: string;
  /** 0-based column within the item's cluster. */
  col: number;
  /** Number of columns in the item's cluster (basis for the block width). */
  cols: number;
  /** Minutes from 00:00 (== item start). */
  top: number;
  /** Height in minutes (== item duration, possibly crossing midnight). */
  height: number;
}

/** "09:30" → 570. Assumes a well-formed HH:MM string. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** 570 → "09:30". Normalizes to [00:00, 23:59] (midnight-crossing friendly). */
export function minutesToTime(minutes: number): string {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Duration of a timed item. A missing endTime means an open-ended 60-minute
 * block; end <= start means the item ends the next day.
 */
export function itemDurationMinutes(start: string, end: string | null): number {
  const startMin = timeToMinutes(start);
  if (end === null) return 60;
  const endMin = timeToMinutes(end);
  const diff = endMin - startMin;
  // end == start → 0 + one day = 24h; end < start → negative + one day.
  return diff > 0 ? diff : diff + MINUTES_PER_DAY;
}

/** Start asc; for equal starts the longer item first; then stable by key. */
function compareItems(a: TimedItem, b: TimedItem): number {
  return (
    a.start - b.start ||
    b.duration - a.duration ||
    (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
  );
}

/**
 * Assigns items to columns within a cluster. `columnEnds` holds the end time
 * of the last item placed in each column (columns never contain overlapping
 * items).
 */
function placeInColumns(
  algorithm: OverlapAlgorithm,
  columnEnds: number[],
  item: TimedItem,
): number {
  const itemEnd = item.start + item.duration;

  if (algorithm === OPTIMAL) {
    // Among the free columns pick the one that was used most recently: packs
    // rows tightly from the top and keeps early-freed columns open for the
    // next wave of items.
    let best = -1;
    let bestEnd = -1;
    for (let index = 0; index < columnEnds.length; index++) {
      if (columnEnds[index] <= item.start && columnEnds[index] > bestEnd) {
        best = index;
        bestEnd = columnEnds[index];
      }
    }
    if (best < 0) {
      columnEnds.push(itemEnd);
      return columnEnds.length - 1;
    }
    columnEnds[best] = itemEnd;
    return best;
  }

  // Simple columns: first free column, scanning left to right.
  const first = columnEnds.findIndex((end) => end <= item.start);
  if (first < 0) {
    columnEnds.push(itemEnd);
    return columnEnds.length - 1;
  }
  columnEnds[first] = itemEnd;
  return first;
}

/**
 * Lays out the timed items of a single day into non-overlapping columns.
 * Items are grouped into clusters of transitively overlapping items; each
 * cluster gets its own column count and the contained blocks tile it evenly
 * (width = 1 / cols), so no two blocks in a cluster can overlap visually.
 */
export function layoutDay(
  items: TimedItem[],
  algorithm: OverlapAlgorithm,
): LayoutPosition[] {
  const sorted = [...items].sort(compareItems);
  const positions: LayoutPosition[] = [];

  let index = 0;
  while (index < sorted.length) {
    // Collect the cluster: every item whose start falls before the current
    // running end belongs to it, transitively.
    const cluster: TimedItem[] = [sorted[index]];
    let maxEnd = sorted[index].start + sorted[index].duration;
    let next = index + 1;
    while (next < sorted.length && sorted[next].start < maxEnd) {
      const item = sorted[next];
      cluster.push(item);
      maxEnd = Math.max(maxEnd, item.start + item.duration);
      next++;
    }

    const columnEnds: number[] = [];
    const placed: { item: TimedItem; col: number }[] = [];
    for (const item of cluster) {
      placed.push({ item, col: placeInColumns(algorithm, columnEnds, item) });
    }
    // Emit only once the cluster is complete: all items share the final
    // column count, so their blocks tile the cluster width evenly.
    const cols = columnEnds.length;
    for (const { item, col } of placed) {
      positions.push({
        key: item.key,
        col,
        cols,
        top: item.start,
        height: item.duration,
      });
    }

    index = next;
  }

  return positions;
}