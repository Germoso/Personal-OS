import Link from "next/link";
import { connection } from "next/server";

import { db } from "@/db";
import { addDaysIso, isValidIsoDate, localTodayIso, weekDays, weekRange } from "@/lib/date";
import * as eventRepo from "@/modules/calendar/db/repository";
import {
  WeekGrid,
  type DayGrid,
} from "@/modules/calendar/components/week-grid";
import type { CalendarItem } from "@/modules/calendar/types";
import * as taskRepo from "@/modules/tasks/db/repository";

// Local SQLite reads are sub-millisecond: render on demand, never prerender stale data.
export const instant = false;

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await connection();

  const { week } = await searchParams;
  const anchor =
    week && isValidIsoDate(week) ? week : localTodayIso();
  const { start, end } = weekRange(anchor);
  const days = weekDays(anchor);
  const today = localTodayIso();

  const events = eventRepo.listEventsBetween(db, start, end);
  const tasks = taskRepo.listTasksForCalendar(db, start, end);

  // Bucket every item under its effective calendar day: day for the date,
  // all-day band vs hour grid depending on whether it has a time window.
  const byDay = new Map<string, DayGrid>(
    days.map((day) => [
      day,
      { date: day, isToday: day === today, allDay: [], timed: [] },
    ]),
  );

  const push = (item: CalendarItem) => {
    const dayGrid = byDay.get(item.date);
    if (!dayGrid) return;
    (item.allDay ? dayGrid.allDay : dayGrid.timed).push(item);
  };

  for (const event of events) {
    push({
      key: `event-${event.id}`,
      kind: "event",
      id: event.id,
      title: event.title,
      notes: event.notes,
      date: event.date,
      allDay: event.startTime === null,
      startTime: event.startTime,
      endTime: event.endTime,
    });
  }

  for (const task of tasks) {
    // Scheduled tasks live on their schedule date; unscheduled ones fall back
    // to their due date (all-day band), preserving the old weekly view.
    const date = task.scheduleDate ?? task.dueDate;
    if (!date) continue;
    const timed = task.startTime !== null;
    push({
      key: `task-${task.id}`,
      kind: "task",
      id: task.id,
      title: task.title,
      notes: task.notes,
      date,
      allDay: !timed,
      startTime: task.startTime,
      endTime: task.endTime,
    });
  }

  const dayGrids = days.map((day) => byDay.get(day)!);
  const prevWeek = addDaysIso(start, -7);
  const nextWeek = addDaysIso(start, 7);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-normal">Calendario</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Semana del {start} al {end}
          </p>
        </div>
        <nav className="flex gap-2 text-sm">
          <Link
            href={`/calendar?week=${prevWeek}`}
            className="rounded border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:text-neutral-100"
          >
            ← Anterior
          </Link>
          <Link
            href={`/calendar?week=${today}`}
            className="rounded border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:text-neutral-100"
          >
            Hoy
          </Link>
          <Link
            href={`/calendar?week=${nextWeek}`}
            className="rounded border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:text-neutral-100"
          >
            Siguiente →
          </Link>
        </nav>
      </header>

      <WeekGrid days={dayGrids} />
    </section>
  );
}