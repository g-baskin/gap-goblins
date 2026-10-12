/** Narrow `request.json()` result to a plain object for safe property access. */
export function parseRequestJsonObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}
