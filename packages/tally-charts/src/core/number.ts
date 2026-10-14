/**
 * Strict numbers from data: numbers pass through and non-blank strings are parsed. Everything
 * else (null, undefined, '', booleans, objects) is missing and becomes NaN instead of 0.
 */
export function toNumber(raw: unknown): number {
  return typeof raw === 'number'
    ? raw
    : typeof raw === 'string' && raw.trim() !== ''
      ? Number(raw)
      : Number.NaN
}
