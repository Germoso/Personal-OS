import { describe, expect, it } from "vitest";

import { NotFoundError, ValidationError } from "@/modules/tasks/db/repository";

import { toActionResult } from "./action-result";

describe("toActionResult (S5)", () => {
  it("wraps a successful result", () => {
    expect(toActionResult(() => ({ id: 1 }))).toEqual({ ok: true, data: { id: 1 } });
  });

  it("turns a validation error into an ok:false result with its message", () => {
    const result = toActionResult(() => {
      throw new ValidationError("A title is required.");
    });

    expect(result.ok).toBe(false);
    expect(result).toEqual({ ok: false, error: "A title is required." });
  });

  it("turns a not-found error into an ok:false result", () => {
    const result = toActionResult(() => {
      throw new NotFoundError("Unknown task id: 404.");
    });

    expect(result).toEqual({ ok: false, error: "Unknown task id: 404." });
  });

  it("rethrows unexpected errors instead of hiding them", () => {
    const boom = new TypeError("db is not a function");
    expect(() =>
      toActionResult(() => {
        throw boom;
      }),
    ).toThrow(boom);
  });

  it("is a no-op when the operation returns null", () => {
    expect(toActionResult(() => null)).toEqual({ ok: true, data: null });
  });
});
