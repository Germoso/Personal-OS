import Link from "next/link";
import { connection } from "next/server";

import { db } from "@/db";
import { addDaysIso, isValidIsoDate, localTodayIso, weekDays, weekRange } from "@/lib/date";
import { EventForm } from "@/modules/calendar/components/event-form";
import * as eventRepo from "@/modules/calendar/db/repository";
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

  const events = eventRepo.listEventsBetween(db, start, end);
  const tasks = taskRepo.listTasksByDueDateRange(db, start, end);

  const eventsByDay = new Map<string, typeof events>();
  const tasksByDay = new Map<string, typeof tasks>();
  for (const day of days) {
    eventsByDay.set(day, []);
    tasksByDay.set(day, []);
  }
  for (const event of events) {
    const bucket = eventsByDay.get(event.date);
    if (bucket) bucket.push(event);
  }
  for (const task of tasks) {
    if (task.dueDate) {
      const bucket = tasksByDay.get(task.dueDate);
      if (bucket) bucket.push(task);
    }
  }

  const prevWeek = addDaysIso(start, -7);
  const nextWeek = addDaysIso(start, 7);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Calendario</h1>
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
            href={`/calendar?week=${localTodayIso()}`}
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

      <EventForm defaultDate={anchor} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsByDay.get(day) ?? [];
          const dayTasks = tasksByDay.get(day) ?? [];
          const isToday = day === localTodayIso();
          return (
            <div
              key={day}
              className={`flex flex-col gap-2 rounded-lg border p-3 ${
                isToday ? "border-neutral-500" : "border-neutral-800"
              } bg-neutral-900`}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {day.slice(5)}
              </div>
              {dayEvents.length === 0 && dayTasks.length === 0 ? (
                <p className="text-xs text-neutral-600">—</p>
              ) : null}
              <ul className="flex flex-col gap-1.5">
                {dayEvents.map((event) => (
                  <li
                    key={event.id}
                    className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs"
                  >
                    <p className="font-medium">{event.title}</p>
                    {event.startTime ? (
                      <p className="text-neutral-500">
                        {event.startTime}
                        {event.endTime ? `–${event.endTime}` : ""}
                      </p>
                    ) : (
                      <p className="text-neutral-500">Todo el día</p>
                    )}
                    {event.notes ? (
                      <p className="mt-0.5 text-neutral-600">{event.notes}</p>
                    ) : null}
                  </li>
                ))}
                {dayTasks.map((task) => (
                  <li
                    key={`task-${task.id}`}
                    className="rounded border border-dashed border-neutral-700 bg-neutral-950 px-2 py-1.5 text-xs"
                  >
                    <p className="font-medium text-neutral-300">{task.title}</p>
                    <p className="text-neutral-500">Tarea</p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
