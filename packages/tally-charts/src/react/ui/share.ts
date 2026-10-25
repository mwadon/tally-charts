import type { Fill, Id, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'

export interface ShareSegment {
  /** React key. Default: the index. */
  id?: Id
  /** Name in the list and the accessible text. */
  label: string
  /** Amount; negative, non-finite or non-numbers count as 0. With no valid value at all, the bar shows "No data". */
  value: number
  /** Default: by position, `accent`, `accent-soft`, `warn`, `neutral`, `gain`, repeating. */
  tone?: Tone
  /** Default 'solid'. */
  fill?: Fill
}

export interface SharePart {
  /** The segment's `id`, or its index. */
  key: Id
  /** The segment's label. */
  label: string
  /** The segment's value, with invalid input as 0. */
  value: number
  /** The segment's tone, or the default for its position. */
  tone: Tone
  /** The segment's fill, or 'solid'. */
  fill: Fill
  /** Share of the whole in percent, unrounded, for widths. */
  share: number
  /** Whole percent from the largest remainder method. */
  percent: number
  /** "46%", or "<1%" for a part above 0 that rounds to 0. */
  percentText: string
}

/** Never 'loss': pink means loss and is only chosen explicitly. */
export const SHARE_TONES: readonly Tone[] = ['accent', 'accent-soft', 'warn', 'neutral', 'gain']

const warn = createWarner()

/** Whole percents that add up to round(sum of shares), by the largest remainder method. */
function largestRemainder(shares: readonly number[]): number[] {
  const floors = shares.map(Math.floor)
  let left = Math.round(shares.reduce((s, v) => s + v, 0)) - floors.reduce((s, v) => s + v, 0)
  const order = shares
    .map((s, i) => ({ i, rest: s - Math.floor(s) }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i)
  for (const { i } of order) {
    if (left <= 0) break
    floors[i] = (floors[i] ?? 0) + 1
    left -= 1
  }
  return floors
}

/** Turns segments into drawable parts: widths, whole percents and default tones. */
export function shareLayout(
  segments: readonly ShareSegment[],
  total?: number,
): { parts: SharePart[]; total: number; empty: boolean } {
  let valid = 0
  const values = segments.map((s) => {
    const ok = Number.isFinite(s.value) && s.value >= 0
    if (ok) valid += 1
    else if (DEV) {
      if (typeof s.value === 'number' && !Number.isFinite(s.value)) {
        warn(
          `share-finite:${s.label}:${s.value}`,
          `ShareBar segment "${s.label}" has a value of ${s.value}, which is not finite; it counts as 0.`,
        )
      } else {
        warn(
          `share-value:${s.label}`,
          `ShareBar segment "${s.label}" has a value that is negative or not a number; it counts as 0.`,
        )
      }
    }
    return ok ? s.value : 0
  })
  const sum = values.reduce((s, v) => s + v, 0)
  let whole = sum
  if (total !== undefined && !Number.isFinite(total)) {
    if (DEV) {
      warn(
        `share-total-nan:${total}`,
        `ShareBar total ${total} is not a finite number; the sum is used.`,
      )
    }
  } else if (total !== undefined) {
    if (total >= sum) whole = total
    else if (DEV) {
      warn(
        `share-total:${total}:${sum}`,
        `ShareBar total ${total} is smaller than the sum of its segments (${sum}); the sum is used.`,
      )
    }
  }
  if (DEV && segments.length > 6) {
    warn(
      `share-count:${segments.length}`,
      `ShareBar has ${segments.length} segments; tones repeat after 5, so neighbours may look alike.`,
    )
  }
  const shares = values.map((v) => (whole > 0 ? (v / whole) * 100 : 0))
  const percents = largestRemainder(shares)
  const parts = segments.map((s, i): SharePart => {
    const value = values[i] ?? 0
    const percent = percents[i] ?? 0
    return {
      key: s.id ?? i,
      label: s.label,
      value,
      tone: s.tone ?? (SHARE_TONES[i % SHARE_TONES.length] as Tone),
      fill: s.fill ?? 'solid',
      share: shares[i] ?? 0,
      percent,
      percentText: percent === 0 && value > 0 ? '<1%' : `${percent}%`,
    }
  })
  return { parts, total: whole, empty: segments.length > 0 && valid === 0 }
}
