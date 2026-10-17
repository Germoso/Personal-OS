"use client";

import { useMemo, useState } from "react";

import {
  itemDurationMinutes,
  layoutDay,
  MINUTES_PER_DAY,
  minutesToTime,
  timeToMinutes,
  type LayoutPosition,
  type OverlapAlgorithm,
} from "../layout";
import type { CalendarItem } from "../types";
import { ItemDialog, type DialogPrefs } from "./item-dialog";

const PIXELS_PER_HOUR = 56;
const HOURS_IN_DAY = 24;
const GRID_HEIGHT = PIXELS_PER_HOUR * HOURS_IN_DAY;
const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;
const MIN_BLOCK_HEIGHT = 14;

const WEEKDAY_LABELS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

export interface DayGrid {
  date: string;
  isToday: boolean;
  allDay: CalendarItem[];
  timed: CalendarItem[];
}

function weekdayLabel(date: string): string {
  const dayNumber = new Date(`${date}T00:00:00`).getDay();
  return WEEKDAY_LABELS[dayNumber];
}

/**
 * Weekly time-grid (Google Calendar style): rows by hour, blocks positioned by
 * start time with height proportional to duration, all-day band on top, and
 * two selectable overlap algorithms. Click an empty slot to create (event or
 * task); click a block to edit/delete.
 */
export function WeekGrid({ days }: { days: DayGrid[] }) {
  const [algorithm, setAlgorithm] = useState<OverlapAlgorithm>("optimal");
  const [dialog, setDialog] = useState<DialogPrefs | null>(null);

  const laidOut = useMemo(() => {
    const byDate = new Map<string, LayoutPosition[]>();
    for (const day of days) {
      const items = day.timed.flatMap((item) =>
        item.startTime === null
          ? []
          : [
              {
                key: item.key,
                start: timeToMinutes(item.startTime),
                duration: itemDurationMinutes(item.startTime, item.endTime),
              },
            ],
      );
      byDate.set(day.date, layoutDay(items, algorithm));
    }
    return byDate;
  }, [days, algorithm]);

  const openCreate = (date: string, startTime: string, endTime: string) =>
    setDialog({ mode: "create", kind: null, date, startTime, endTime, item: null });

  const openEdit = (item: CalendarItem) =>
    setDialog({
      mode: "edit",
      kind: item.kind,
      date: item.date,
      startTime: item.startTime ?? "",
      endTime: item.endTime ?? "",
      item,
    });

  const close = () => setDialog(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-500">
          Haz clic en un hueco para crear un evento o tarea; clic en un bloque
          para editarlo o borrarlo.
        </p>
        <label className="flex shrink-0 items-center gap-2 text-xs text-neutral-400">
          Solapamientos:
          <select
            value={algorithm}
            onChange={(event) =>
              setAlgorithm(event.target.value as OverlapAlgorithm)
            }
            className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-200"
          >
            <option value="optimal">Óptimo (top→bottom)</option>
            <option value="columns">Columnas simples</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          {/* Day headers (with today highlighted). */}
          <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] gap-px">
            <div className="sticky left-0 z-10 bg-neutral-950" />
            {days.map((day) => (
              <div
                key={day.date}
                className={`flex items-center gap-1.5 rounded-t border border-b-0 px-2 py-2 ${
                  day.isToday
                    ? "border-neutral-500 bg-neutral-800"
                    : "border-neutral-800 bg-neutral-900"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                  {weekdayLabel(day.date)}
                </span>
                <span
                  className={
                    day.isToday
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-semibold text-neutral-900"
                      : "text-xs font-medium text-neutral-200"
                  }
                >
                  {Number(day.date.slice(8))}
                </span>
              </div>
            ))}
          </div>

          {/* All-day band: events without a time + unscheduled tasks. */}
          <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] gap-px border-x border-b border-neutral-800 bg-neutral-950">
            <div className="sticky left-0 z-10 flex items-center justify-end bg-neutral-950 pr-2 text-[10px] uppercase tracking-wide text-neutral-500">
              Todo el día
            </div>
            {days.map((day) => (
              <div
                key={day.date}
                role="button"
                tabIndex={0}
                onClick={() => openCreate(day.date, "", "")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openCreate(day.date, "", "");
                  }
                }}
                className={`flex min-h-14 flex-col gap-1 p-1 ${
                  day.isToday
                    ? "bg-neutral-800/30 hover:bg-neutral-800/50"
                    : "bg-neutral-900 hover:bg-neutral-800/40"
                }`}
                aria-label={`Nuevo item todo el día el ${day.date}`}
              >
                {day.allDay.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openEdit(item);
                    }}
                    title={item.title}
                    className={`truncate rounded border px-1.5 py-0.5 text-left text-[11px] ${
                      item.kind === "task"
                        ? "border-dashed border-neutral-500 bg-neutral-800 text-neutral-200"
                        : "border-solid border-neutral-600 bg-neutral-700/60 text-neutral-100"
                    } hover:brightness-125`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Hour grid: one column per day, hour rows, positioned blocks. */}
          <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] gap-px">
            <div className="sticky left-0 z-10 bg-neutral-950">
              <div className="relative" style={{ height: GRID_HEIGHT }}>
                {Array.from({ length: HOURS_IN_DAY }, (_, hour) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-neutral-800/80 pr-2 text-right text-[10px] text-neutral-500"
                    style={{ top: hour * PIXELS_PER_HOUR }}
                  >
                    {minutesToTime(hour * 60)}
                  </div>
                ))}
              </div>
            </div>

            {days.map((day) => {
              const positions = laidOut.get(day.date) ?? [];
              return (
                <div
                  key={day.date}
                  className={`relative overflow-hidden rounded-b border border-t-0 ${
                    day.isToday ? "border-neutral-500" : "border-neutral-800"
                  } bg-neutral-900`}
                  style={{ height: GRID_HEIGHT }}
                >
                  {Array.from({ length: HOURS_IN_DAY }, (_, hour) => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() =>
                        openCreate(
                          day.date,
                          minutesToTime(hour * 60),
                          minutesToTime(hour * 60 + 60),
                        )
                      }
                      className={`absolute inset-x-0 border-t border-neutral-800/70 hover:bg-neutral-700/15 ${
                        day.isToday ? "bg-neutral-800/10" : ""
                      }`}
                      style={{ top: hour * PIXELS_PER_HOUR, height: PIXELS_PER_HOUR }}
                      aria-label={`Nuevo item ${day.date} ${minutesToTime(hour * 60)}`}
                    />
                  ))}
                  {positions.map((position) => {
                    const item = day.timed.find(
                      (candidate) => candidate.key === position.key,
                    );
                    if (!item) return null;
                    const heightPx = Math.max(
                      Math.min(
                        position.height,
                        MINUTES_PER_DAY - position.top,
                      ) * PIXELS_PER_MINUTE,
                      MIN_BLOCK_HEIGHT,
                    );
                    const timeLabel = item.endTime
                      ? `${item.startTime} – ${item.endTime}`
                      : item.startTime;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => openEdit(item)}
                        title={`${item.title} · ${timeLabel}`}
                        className={`absolute overflow-hidden rounded border px-1.5 py-1 text-left text-xs shadow ${
                          item.kind === "task"
                            ? "border-dashed border-neutral-500 bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
                            : "border-solid border-neutral-500 bg-neutral-700/70 text-neutral-100 hover:bg-neutral-600/80"
                        }`}
                        style={{
                          top: position.top * PIXELS_PER_MINUTE,
                          height: heightPx,
                          left: `${(position.col / position.cols) * 100}%`,
                          width: `${(1 / position.cols) * 100}%`,
                        }}
                      >
                        <span className="block truncate font-medium">
                          {item.title}
                        </span>
                        {heightPx > 34 ? (
                          <span className="block truncate text-[10px] text-neutral-300/90">
                            {timeLabel}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {dialog ? <ItemDialog prefs={dialog} onClose={close} /> : null}
    </div>
  );
}