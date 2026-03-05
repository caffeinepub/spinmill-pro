/**
 * Normalizes Candid-decoded values to plain TypeScript-friendly values.
 *
 * The ICP Candid JS library decodes Motoko types as follows:
 *  - Variants: `{ #inStock }` → `{ inStock: null }`
 *  - Optionals: `?Text` → `[]` (None) or `["value"]` (Some)
 *
 * This module provides helpers to convert those into plain strings and
 * optional primitives that the frontend code can use directly.
 */

/**
 * Converts a Candid variant object (e.g. `{ inStock: null }`) to its string key.
 * If the value is already a string, it is returned as-is.
 */
export function normalizeVariant(value: unknown): string {
  if (typeof value === "string") return value;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value as object);
    if (keys.length === 1) return keys[0];
  }
  return String(value);
}

/**
 * Unwraps a Candid optional (`[] | [T]`) to `T | undefined`.
 */
export function normalizeOptional<T>(
  value: [] | [T] | undefined,
): T | undefined {
  if (!Array.isArray(value)) return value as T | undefined;
  return value.length > 0 ? value[0] : undefined;
}

/**
 * Recursively normalizes all Candid-encoded fields in a record or array:
 *  - Variant objects `{ key: null }` → string key
 *  - Optional arrays `[value]` / `[]` → `value` / `undefined`
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeRecord<T>(record: T): T {
  if (record === null || record === undefined) return record;
  if (typeof record === "bigint") return record;
  if (typeof record !== "object") return record;

  if (Array.isArray(record)) {
    // Check if it looks like a Candid optional: an array with 0 or 1 element
    // that is NOT a plain array of records (i.e. a top-level collection)
    // We distinguish by checking element type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (record as any[]).map(normalizeRecord) as unknown as T;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {};
  for (const [key, val] of Object.entries(record as object)) {
    result[key] = normalizeValue(val);
  }
  return result as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeValue(val: unknown): any {
  if (val === null || val === undefined) return val;
  if (typeof val === "bigint") return val;
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val;
  if (typeof val === "string") return val;

  if (Array.isArray(val)) {
    // Candid optional: [] = None, [x] = Some(x)
    if (val.length === 0) return undefined;
    if (val.length === 1) return normalizeValue(val[0]);
    // Regular array of multiple items (e.g. query results) - normalize each
    return val.map(normalizeValue);
  }

  // Plain object
  const keys = Object.keys(val as object);
  // Candid variant: exactly one key with null value
  if (keys.length === 1 && (val as Record<string, unknown>)[keys[0]] === null) {
    return keys[0];
  }
  // Nested record - recurse
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {};
  for (const [k, v] of Object.entries(val as object)) {
    result[k] = normalizeValue(v);
  }
  return result;
}
