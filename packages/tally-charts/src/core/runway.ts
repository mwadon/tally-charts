import { type TimeInput, toTime } from './time'
import { createWarner, DEV } from './warn'

/** A projected share of the allowance at a moment. */
export interface RunwayPoint {
  at: Date
  used: number
}

export interface RunwayForecastInput {
  /** Share of the allowance used so far, 0–1 (may exceed 1). */
  used: number
  windowStart: TimeInput
  resetAt: TimeInput
  now: TimeInput
  /** Share of the allowance per millisecond. Default: used / (now − windowStart). */
  pace?: number
}

export interface RunwayForecast {
  /** `[now, used]`, then a straight line at the pace to `runsOutAt` (used 1) or to `resetAt`. */
  projection: RunwayPoint[]
  /** When the projection reaches 1 before `resetAt`; undefined if it does not. */
  runsOutAt?: Date
  resetAt: Date
  /** Projected share at `resetAt`, uncapped (0.53 reads "~53% at reset"). */
  usedAtReset: number
  /** The pace over the even pace, 1 / (resetAt − windowStart). 1.0 reads "1.0x even". */
  paceRatio: number
  /** Share of the window elapsed at `now`, 0–1. */
  elapsed: number
  /** From `runsOutAt` to `resetAt` in ms, or 0. */
  lockedMs: number
}

const warn = createWarner()

/**
 * Where an allowance is heading at a steady pace: when it runs out, how long it then stays
 * locked, and how much is used at reset. Spread the result into a `RunwayChart` row.
 */
export function runwayForecast(input: RunwayForecastInput): RunwayForecast {
  const { used, pace } = input
  const start = toTime(input.windowStart)
  const reset = toTime(input.resetAt)
  const now = toTime(input.now)
  if (
    start === undefined ||
    reset === undefined ||
    now === undefined ||
    start >= reset ||
    !(Number.isFinite(used) && used >= 0) ||
    (pace !== undefined && !(Number.isFinite(pace) && pace >= 0))
  ) {
    if (DEV) {
      warn(
        'runway-forecast-input',
        'runwayForecast needs a used share of 0 or more, valid dates with windowStart before resetAt, and a pace of 0 or more; it returned no projection.',
      )
    }
    return {
      projection: [],
      resetAt: new Date(reset ?? Number.NaN),
      usedAtReset: Number.NaN,
      paceRatio: Number.NaN,
      elapsed: Number.NaN,
      lockedMs: 0,
    }
  }
  const window = reset - start
  const rate = pace ?? (now > start ? used / (now - start) : 0)
  const base = {
    resetAt: new Date(reset),
    paceRatio: rate * window,
    elapsed: Math.min(1, Math.max(0, (now - start) / window)),
  }
  const first: RunwayPoint = { at: new Date(now), used }
  if (reset <= now) return { ...base, projection: [first], usedAtReset: used, lockedMs: 0 }
  const usedAtReset = used + rate * (reset - now)
  if (used >= 1) {
    return {
      ...base,
      projection: [first],
      runsOutAt: new Date(now),
      usedAtReset,
      lockedMs: reset - now,
    }
  }
  if (rate > 0 && usedAtReset >= 1) {
    const out = now + (1 - used) / rate
    return {
      ...base,
      projection: [first, { at: new Date(out), used: 1 }],
      runsOutAt: new Date(out),
      usedAtReset,
      lockedMs: reset - out,
    }
  }
  return {
    ...base,
    projection: [first, { at: new Date(reset), used: usedAtReset }],
    usedAtReset,
    lockedMs: 0,
  }
}
