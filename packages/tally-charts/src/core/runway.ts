import type { DateFormatter } from './date'
import { levelFor } from './thresholds'
import { DAY, type TimeInput, toTime } from './time'
import type { SeqLevel } from './types'
import { createWarner, DEV, type Warn } from './warn'

/** A projected share of the allowance at a moment. */
export interface RunwayPoint {
  /** The moment. */
  at: Date
  /** Cumulative share of the allowance used by then, 0–1. */
  used: number
}

/** What {@link runwayForecast} needs to know about one allowance. */
export interface RunwayForecastInput {
  /** Share of the allowance used so far, 0–1 (may exceed 1). */
  used: number
  /** When the current window began: the observed pace is measured from here. */
  windowStart: TimeInput
  /** When the allowance resets and the window ends. */
  resetAt: TimeInput
  /** The moment `used` was read. */
  now: TimeInput
  /**
   * Share of the allowance used per day: `0.113` is 11.3 percentage points a day. Default: the
   * observed pace, used / (now − windowStart) in days.
   *
   * @example
   * ```ts
   * // 40% used, 5% a day from here: runs out 12 days after now unless it resets first.
   * runwayForecast({ used: 0.4, pace: 0.05, windowStart, resetAt, now })
   * ```
   */
  pace?: number
}

/** What {@link runwayForecast} returns; spread it into a `RunwayChart` row. */
export interface RunwayForecast {
  /** `[now, used]`, then a straight line at the pace to `runsOutAt` (used 1) or to `resetAt`. */
  projection: RunwayPoint[]
  /** When the projection reaches 1 before `resetAt`; undefined if it does not. */
  runsOutAt?: Date
  /** The input's `resetAt` as a Date (an invalid Date when the input was invalid). */
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

const warn = /* @__PURE__ */ createWarner()

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
  // Share per ms: `pace` is given per day.
  const rate = pace !== undefined ? pace / DAY : now > start ? used / (now - start) : 0
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
  // Reaching exactly 1 at the reset is not running out: nothing is locked.
  if (rate > 0 && usedAtReset > 1) {
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

// --- Internal: the cell model RunwayChart draws. Not exported from any index. ---

// Plain literals: a bundler can't prove `60 * MINUTE` pure, so it would keep it in every bundle.
const UNIT: Record<string, number> = { m: 6e4, h: 36e5, d: 864e5 }

export const DEFAULT_CELL = 216e5 // 6 h
export const MAX_CELLS = 200
export const DEFAULT_BREAKS: readonly number[] = [0.25, 0.5, 0.75]

/** Cell length in ms from `'30m'`, `'6h'`, `'1d'` or ms; undefined when it is not one. */
export function parseCell(cell: string | number | undefined): number | undefined {
  if (cell === undefined) return DEFAULT_CELL
  if (typeof cell === 'number') return Number.isFinite(cell) && cell > 0 ? cell : undefined
  const m = /^(\d+(?:\.\d+)?)([mhd])$/.exec(cell)
  const ms = m ? Number(m[1]) * (UNIT[m[2] as string] as number) : Number.NaN
  return ms > 0 ? ms : undefined
}

/** Consecutive cells from the domain start; the last is cut at the end; at most MAX_CELLS. */
export function cellBounds(
  domain: readonly [number, number],
  cellMs: number,
): { bounds: [number, number][]; cut: boolean } {
  const [d0, d1] = domain
  const bounds: [number, number][] = []
  for (let t = d0; t < d1 && bounds.length < MAX_CELLS; t += cellMs) {
    bounds.push([t, Math.min(t + cellMs, d1)])
  }
  const last = bounds[bounds.length - 1]
  return { bounds, cut: last !== undefined && last[1] < d1 }
}

export interface RunwayRowInput {
  id: string
  projection?: readonly { at: TimeInput; used: number }[]
  runsOutAt?: TimeInput
  resetAt?: TimeInput
  disconnected?: boolean
}

export interface RunwayTimes {
  points: { at: number; used: number }[]
  runsOutAt?: number
  resetAt?: number
  forecast: boolean
}

/** A row's dates as epoch ms, its projection cleaned and sorted, with warnings for what was fixed. */
export function normalizeRow(row: RunwayRowInput, warn: Warn): RunwayTimes {
  const points: { at: number; used: number }[] = []
  for (const p of row.projection ?? []) {
    const at = toTime(p.at)
    if (at === undefined || !(Number.isFinite(p.used) && p.used >= 0)) {
      if (DEV) {
        warn(
          'runway-projection',
          `RunwayChart dropped a projection point without a valid date or a used share of 0 or more in row "${row.id}".`,
        )
      }
      continue
    }
    points.push({ at, used: p.used })
  }
  if (points.some((p, i) => i > 0 && (points[i - 1] as { at: number }).at > p.at)) {
    if (DEV) {
      warn(
        'runway-projection-order',
        `RunwayChart sorted the projection of row "${row.id}" by date.`,
      )
    }
    points.sort((a, b) => a.at - b.at)
  }
  const date = (value: TimeInput | undefined, name: string) => {
    if (value === undefined) return undefined
    const t = toTime(value)
    if (DEV && t === undefined) {
      warn('runway-dates', `RunwayChart ignored an invalid ${name} in row "${row.id}".`)
    }
    return t
  }
  let runsOutAt = date(row.runsOutAt, 'runsOutAt')
  const resetAt = date(row.resetAt, 'resetAt')
  if (runsOutAt !== undefined && resetAt !== undefined && runsOutAt > resetAt) {
    if (DEV) {
      warn('runway-runs-out', `RunwayChart ignored a runsOutAt after resetAt in row "${row.id}".`)
    }
    runsOutAt = undefined
  }
  return { points, runsOutAt, resetAt, forecast: !row.disconnected && points.length > 0 }
}

/** The projection at `t`: linear between points, the end values outside them; NaN without points. */
export function projectionAt(points: readonly { at: number; used: number }[], t: number): number {
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) return Number.NaN
  if (t <= first.at) return first.used
  if (t >= last.at) return last.used
  const i = points.findIndex((p) => p.at >= t)
  const b = points[i] as { at: number; used: number }
  const a = points[i - 1] as { at: number; used: number }
  return b.at === a.at ? b.used : a.used + ((b.used - a.used) * (t - a.at)) / (b.at - a.at)
}

export type RunwayCellState = 'level' | 'runs-out' | 'locked' | 'empty'

export interface RunwayCell {
  start: number
  end: number
  state: RunwayCellState
  /** Sequential level for 'level' cells, else 0. */
  level: SeqLevel | 0
}

/** Each cell's state, decided at its midpoint (spec §3.1). */
export function runwayCells(
  times: RunwayTimes,
  bounds: readonly [number, number][],
  edges: readonly number[],
  levels: readonly SeqLevel[],
): RunwayCell[] {
  const { points, runsOutAt, resetAt, forecast } = times
  return bounds.map(([start, end]) => {
    const mid = (start + end) / 2
    const cell = (state: RunwayCellState, level: SeqLevel | 0 = 0) => ({ start, end, state, level })
    if (!forecast) return cell('empty')
    if (resetAt !== undefined && mid >= resetAt) return cell('empty')
    if (runsOutAt !== undefined && start <= runsOutAt && runsOutAt < end) return cell('runs-out')
    if (runsOutAt !== undefined && mid > runsOutAt) return cell('locked')
    return cell('level', levelFor(projectionAt(points, mid), edges, levels))
  })
}

export interface RunwayDateFormats {
  weekday: DateFormatter
  day: DateFormatter
  time: DateFormatter
}

/** What RunwayChart derived for a row: passed to a custom `status`. */
export interface RunwayFacts {
  /** The row's `runsOutAt`, if valid and not after `resetAt`. */
  runsOutAt?: Date
  /** The row's `resetAt`, if valid. */
  resetAt?: Date
  /**
   * The row's projection read at `resetAt`, or NaN without a forecast or a reset. It is only as
   * uncapped as the projection: a row from `runwayForecast` that runs out ends its projection at
   * 1, so it reads 1 here, not the forecast's own `usedAtReset`.
   */
  usedAtReset: number
  /** True when `runsOutAt` falls after the domain end. */
  runsOutBeyond: boolean
  /** True when `resetAt` falls after the domain end. */
  resetBeyond: boolean
  /** True when the row has projection points and is not disconnected. */
  forecast: boolean
}

const SIX_DAYS = 5184e5 // 6 d

/** "Fri 03:24" within six days of now, "Oct 21 09:21" later in the domain, "Nov 9" past its end. */
export function runwayDate(
  ms: number,
  now: number,
  end: number,
  f: RunwayDateFormats,
): { text: string; beyond: boolean } {
  if (ms > end) return { text: f.day(ms), beyond: true }
  // Weekday names only near now, on either side: weeks ago reads as a date.
  const date = Math.abs(ms - now) < SIX_DAYS ? f.weekday(ms) : f.day(ms)
  return { text: `${date} ${f.time(ms)}`, beyond: false }
}

export function runwayFacts(times: RunwayTimes, end: number): RunwayFacts {
  const { runsOutAt, resetAt, forecast, points } = times
  return {
    runsOutAt: runsOutAt === undefined ? undefined : new Date(runsOutAt),
    resetAt: resetAt === undefined ? undefined : new Date(resetAt),
    usedAtReset: forecast && resetAt !== undefined ? projectionAt(points, resetAt) : Number.NaN,
    runsOutBeyond: runsOutAt !== undefined && runsOutAt > end,
    resetBeyond: resetAt !== undefined && resetAt > end,
    forecast,
  }
}

/** The default two-line status (spec §3.2). */
export function statusLines(
  facts: RunwayFacts,
  disconnected: boolean,
  now: number,
  end: number,
  f: RunwayDateFormats,
): string[] {
  if (disconnected) return ['Disconnected']
  const lines: string[] = []
  if (facts.runsOutAt) {
    lines.push(`Runs out ${runwayDate(facts.runsOutAt.getTime(), now, end, f).text}`)
  } else if (facts.forecast && Number.isFinite(facts.usedAtReset)) {
    lines.push(`~${Math.round(facts.usedAtReset * 100)}% at reset`)
  } else {
    lines.push('No forecast')
  }
  if (facts.resetAt) {
    const d = runwayDate(facts.resetAt.getTime(), now, end, f)
    lines.push(`Resets ${d.text}${d.beyond ? ' →' : ''}`)
  }
  return lines
}
