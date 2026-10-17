import { describe, expect, it } from "vitest";

import {
  layoutDay,
  itemDurationMinutes,
  MINUTES_PER_DAY,
  minutesToTime,
  timeToMinutes,
  type LayoutPosition,
  type OverlapAlgorithm,
  type TimedItem,
} from "./layout";

function at(
  start: string,
  durationMinutes: number,
  key = start,
): TimedItem {
  return { key, start: timeToMinutes(start), duration: durationMinutes };
}

/** Any two items that collide in time must end up in different columns. */
function expectNoOverlap(
  items: TimedItem[],
  positions: LayoutPosition[],
): void {
  const posByKey = new Map(positions.map((p) => [p.key, p]));
  expect(posByKey.size).toBe(items.length);

  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    const pa = posByKey.get(a.key)!;
    expect(pa.col).toBeGreaterThanOrEqual(0);
    expect(pa.col).toBeLessThan(pa.cols);
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j];
      const pb = posByKey.get(b.key)!;
      const timeOverlap =
        a.start < b.start + b.duration && b.start < a.start + a.duration;
      expect(
        !timeOverlap || pa.col !== pb.col,
        `${a.key} and ${b.key} overlap in time but share column ${pa.col}`,
      ).toBe(true);
    }
  }
}

describe("timeToMinutes / minutesToTime", () => {
  it("converts HH:MM to minutes and back", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("23:59")).toBe(1439);
    expect(minutesToTime(0)).toBe("00:00");
    expect(minutesToTime(570)).toBe("09:30");
    expect(minutesToTime(1439)).toBe("23:59");
  });

  it("normalizes minutes at and beyond midnight", () => {
    expect(minutesToTime(1440)).toBe("00:00");
    expect(minutesToTime(1440 + 45)).toBe("00:45");
    expect(minutesToTime(90)).toBe("01:30");
  });
});

describe("itemDurationMinutes (altura por duración)", () => {
  it("defaults an open-ended item to 60 minutes", () => {
    expect(itemDurationMinutes("09:00", null)).toBe(60);
  });

  it("computes the plain difference within the same day", () => {
    expect(itemDurationMinutes("09:30", "10:15")).toBe(45);
    expect(itemDurationMinutes("00:00", "23:00")).toBe(1380);
  });

  it("treats an end after midnight as the next day (cruce de medianoche)", () => {
    expect(itemDurationMinutes("22:00", "02:00")).toBe(240);
    expect(itemDurationMinutes("23:30", "00:15")).toBe(45);
  });

  it("treats end == start as a full day (24h)", () => {
    expect(itemDurationMinutes("09:00", "09:00")).toBe(MINUTES_PER_DAY);
  });
});

describe("layoutDay", () => {
  const algorithms: OverlapAlgorithm[] = ["columns", "optimal"];

  it("returns the items ordered top-to-bottom (start asc)", () => {
    const items = [at("14:00", 60, "a"), at("09:00", 60, "b"), at("11:00", 30, "c")];
    for (const algorithm of algorithms) {
      const positions = layoutDay(items, algorithm);
      expect(positions.map((p) => p.top)).toEqual([540, 660, 840]);
    }
  });

  it("places non-overlapping items full width in their own single column", () => {
    for (const algorithm of algorithms) {
      const positions = layoutDay(
        [at("09:00", 60, "a"), at("11:00", 60, "b")],
        algorithm,
      );
      expect(positions).toEqual([
        { key: "a", col: 0, cols: 1, top: 540, height: 60 },
        { key: "b", col: 0, cols: 1, top: 660, height: 60 },
      ]);
    }
  });

  it("gives the block height of each item in minutes (altura por duración)", () => {
    for (const algorithm of algorithms) {
      const positions = layoutDay(
        [at("09:00", 30, "corta"), at("10:00", 90, "larga")],
        algorithm,
      );
      expect(positions.map((p) => p.height)).toEqual([30, 90]);
      expect(positions.map((p) => p.top)).toEqual([540, 600]);
    }
  });

  it("stacks an overlapping pair in two columns", () => {
    for (const algorithm of algorithms) {
      const positions = layoutDay(
        [at("09:00", 120, "a"), at("10:00", 120, "b")],
        algorithm,
      );
      expect(positions.map((p) => p.col).sort()).toEqual([0, 1]);
      expect(positions.every((p) => p.cols === 2)).toBe(true);
    }
  });

  it("resolves a three-way simultaneous overlap", () => {
    for (const algorithm of algorithms) {
      const positions = layoutDay(
        [at("09:00", 60, "a"), at("09:00", 90, "b"), at("09:00", 30, "c")],
        algorithm,
      );
      expect(positions.map((p) => p.col).sort()).toEqual([0, 1, 2]);
      expect(positions.every((p) => p.cols === 3)).toBe(true);
    }
  });

  it("never produces visually overlapping blocks for either algorithm", () => {
    const fixtures: TimedItem[][] = [
      [at("09:00", 60, "a"), at("10:00", 60, "b")],
      [
        at("09:00", 300, "a"),
        at("09:00", 120, "b"),
        at("10:00", 120, "c"),
        at("13:00", 180, "d"),
        at("13:00", 240, "e"),
      ],
      [
        at("08:00", 60, "a"),
        at("08:30", 30, "b"),
        at("09:00", 60, "c"),
        at("09:30", 30, "d"),
      ],
      [
        at("12:00", 180, "a"),
        at("12:30", 30, "b"),
        at("13:00", 60, "c"),
        at("14:00", 120, "d"),
        at("16:00", 60, "e"),
      ],
    ];
    for (const algorithm of algorithms) {
      for (const items of fixtures) {
        const positions = layoutDay(items, algorithm);
        expectNoOverlap(items, positions);
      }
    }
  });

  describe("algorithms differ on a staggered fixture", () => {
    // A(9-14) B(9-11) C(10-12) D(13-16) E(13-17): both use 3 columns but pack
    // the late pair (D, E) into different columns.
    const items = [
      at("09:00", 300, "A"),
      at("09:00", 120, "B"),
      at("10:00", 120, "C"),
      at("13:00", 180, "D"),
      at("13:00", 240, "E"),
    ];

    it("columns: first free column, left to right", () => {
      const positions = layoutDay(items, "columns");
      const cols = Object.fromEntries(positions.map((p) => [p.key, p.col]));
      expect(cols).toEqual({ A: 0, B: 1, C: 2, E: 1, D: 2 });
      expect(positions.every((p) => p.cols === 3)).toBe(true);
    });

    it("optimal: packs into the most recently used free column", () => {
      const positions = layoutDay(items, "optimal");
      const cols = Object.fromEntries(positions.map((p) => [p.key, p.col]));
      expect(cols).toEqual({ A: 0, B: 1, C: 2, E: 2, D: 1 });
      expect(positions.every((p) => p.cols === 3)).toBe(true);
    });
  });

  it("handles a midnight-crossing item (ends next day)", () => {
    for (const algorithm of algorithms) {
      const positions = layoutDay(
        [at("22:00", itemDurationMinutes("22:00", "02:00"), "noche")],
        algorithm,
      );
      expect(positions[0]).toMatchObject({
        key: "noche",
        top: 1320,
        height: 240,
        col: 0,
        cols: 1,
      });
    }
  });

  it("keeps clusters independent: a gap splits the columns count", () => {
    for (const algorithm of algorithms) {
      const positions = layoutDay(
        [
          at("09:00", 120, "a1"),
          at("09:30", 120, "a2"),
          at("14:00", 60, "b"),
          at("15:00", 60, "c"),
        ],
        algorithm,
      );
      const map = Object.fromEntries(positions.map((p) => [p.key, p]));
      expect([map.a1.cols, map.a2.cols]).toEqual([2, 2]);
      expect([map.b.cols, map.c.cols]).toEqual([1, 1]);
      expect(map.b.top).toBe(840);
    }
  });
});