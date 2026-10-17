import { NotFoundError, ValidationError } from "./db/repository";

/**
 * Result shape returned by every server action: data on success, a
 * human-readable message when the user gave invalid or unknown input.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Maps expected domain errors (validation, not-found) into ActionResult and lets
 * unexpected errors propagate, so bugs are never hidden as user-facing messages.
 */
export function toActionResult<T>(operation: () => T): ActionResult<T> {
  try {
    return { ok: true, data: operation() };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
