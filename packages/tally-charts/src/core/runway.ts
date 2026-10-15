import type { DateFormatter } from './date'
import { levelFor } from './thresholds'
import { DAY, type TimeInput, toTime } from './time'
import type { SeqLevel } from './types'
import { createWarner, DEV, type Warn } from './warn'

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

// --- Internal: the cell model RunwayChart draws. Not exported from any index. ---

const MINUTE = 6e4
const UNIT: Record<string, number> = { m: MINUTE, h: 60 * MINUTE, d: DAY }

export const DEFAULT_CELL = 6 * 60 * MINUTE
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
    if (t === undefined && DEV) {
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
  runsOutAt?: Date
  resetAt?: Date
  /** The projection at `resetAt` (uncapped), or NaN without a forecast or a reset. */
  usedAtReset: number
  /** True when `runsOutAt` falls after the domain end. */
  runsOutBeyond: boolean
  /** True when `resetAt` falls after the domain end. */
  resetBeyond: boolean
  forecast: boolean
}

const SIX_DAYS = 6 * DAY

/** "Fri 03:24" within six days of now, "Oct 21 09:21" later in the domain, "Nov 9" past its end. */
export function runwayDate(
  ms: number,
  now: number,
  end: number,
  f: RunwayDateFormats,
): { text: string; beyond: boolean } {
  if (ms > end) return { text: f.day(ms), beyond: true }
  const date = ms - now < SIX_DAYS ? f.weekday(ms) : f.day(ms)
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
