import { describe, expect, it } from "vitest";

import { addDaysIso, isValidIsoDate, weekDays, weekRange } from "./date";

describe("isValidIsoDate", () => {
  it("accepts calendar dates and rejects impossible or malformed ones", () => {
    expect(isValidIsoDate("2026-02-14")).toBe(true);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("14-02-2026")).toBe(false);
    expect(isValidIsoDate("")).toBe(false);
  });
});

describe("addDaysIso", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDaysIso("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("weekRange (S8)", () => {
  it("returns the Monday-Sunday week that contains the anchor", () => {
    // 2026-01-14 is a Wednesday
    expect(weekRange("2026-01-14")).toEqual({
      start: "2026-01-12",
      end: "2026-01-18",
    });
  });

  it("keeps a Monday anchor at the start of its own week", () => {
    expect(weekRange("2026-01-12")).toEqual({
      start: "2026-01-12",
      end: "2026-01-18",
    });
  });

  it("treats Sunday as the last day of the week that started on Monday", () => {
    expect(weekRange("2026-01-18")).toEqual({
      start: "2026-01-12",
      end: "2026-01-18",
    });
  });

  it("crosses the year boundary correctly", () => {
    // 2026-01-01 is a Thursday
    expect(weekRange("2026-01-01")).toEqual({
      start: "2025-12-29",
      end: "2026-01-04",
    });
  });

  it("rejects an invalid anchor", () => {
    expect(() => weekRange("2026-02-30")).toThrow(/date/i);
  });
});

describe("weekDays (S8)", () => {
  it("returns seven consecutive days starting on Monday", () => {
    const days = weekDays("2026-01-14");

    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-01-12");
    expect(days[6]).toBe("2026-01-18");
    expect(new Set(days).size).toBe(7);
  });
});
