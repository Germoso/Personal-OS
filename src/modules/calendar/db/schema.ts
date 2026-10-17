import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestamps } from "@/db/columns";

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    // Local calendar day (YYYY-MM-DD); the app is single time zone by design.
    date: text("date").notNull(),
    // HH:MM 24h. Both null means an all-day event.
    startTime: text("start_time"),
    endTime: text("end_time"),
    ...timestamps,
  },
  (table) => [index("events_date_idx").on(table.date)],
);
