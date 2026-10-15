import { tickStep } from 'd3-array'
import {
  type CountableTimeInterval,
  type TimeInterval,
  timeDay,
  timeHour,
  timeMinute,
  timeMonth,
  timeSecond,
  timeSunday,
  timeYear,
  unixDay,
  utcHour,
  utcMillisecond,
  utcMinute,
  utcMonth,
  utcSecond,
  utcSunday,
  utcYear,
} from 'd3-time'
import { linearScale } from './linear'

/** A point in time: a `Date`, epoch milliseconds, or an ISO 8601 string. */
export type TimeInput = Date | number | string

/** The calendar ticks and labels follow. `'utc'` renders the same on the server and the client. */
export type TimeZone = 'utc' | 'local'

/** Epoch milliseconds to pixels, with ticks on calendar boundaries. */
export interface TimeScale {
  /** Epoch ms → px. */
  (value: number): number
  /** px → epoch ms. */
  invert(px: number): number
  domain(): [number, number]
  range(): [number, number]
  /** Tick values in epoch ms, about `count` of them (default 5), on calendar boundaries. */
  ticks(count?: number): number[]
  zone: TimeZone
}

export const DAY = 864e5
const YEAR = 365 * DAY

/**
 * Epoch milliseconds from a `Date`, a finite number, or a string `Date.parse` accepts (so a
 * date-only ISO string is UTC midnight). Anything else, or an invalid date, is `undefined`.
 */
export function toTime(value: unknown): number | undefined {
  const ms =
    value instanceof Date
      ? value.getTime()
      : typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Date.parse(value)
          : Number.NaN
  return Number.isFinite(ms) ? ms : undefined
}

/** Second, minute, hour, day, week, month and year in each zone. */
const UNITS: Record<TimeZone, readonly CountableTimeInterval[]> = {
  utc: [utcSecond, utcMinute, utcHour, unixDay, utcSunday, utcMonth, utcYear],
  local: [timeSecond, timeMinute, timeHour, timeDay, timeSunday, timeMonth, timeYear],
}

type Rung = readonly [unit: number, step: number, ms: number]

/** 1s, 5s, 15s, 30s, 1min, 5min, 15min, 30min, 1h, 3h, 6h, 12h, 1d, 2d, 1w, 1mo, 3mo, 1y. */
const LADDER: readonly Rung[] = [
  [0, 1, 1e3],
  [0, 5, 5e3],
  [0, 15, 15e3],
  [0, 30, 3e4],
  [1, 1, 6e4],
  [1, 5, 3e5],
  [1, 15, 9e5],
  [1, 30, 18e5],
  [2, 1, 36e5],
  [2, 3, 108e5],
  [2, 6, 216e5],
  [2, 12, 432e5],
  [3, 1, DAY],
  [3, 2, 2 * DAY],
  [4, 1, 7 * DAY],
  [5, 1, 30 * DAY],
  [5, 3, 90 * DAY],
  [6, 1, YEAR],
]

/**
 * The calendar interval for about `count` ticks over [start, stop], picked like d3's
 * `tickInterval`: the rung closest to `span / count`, year multiples past the last rung, and
 * millisecond multiples below the first. Null when nothing fits, e.g. a zero span.
 */
export function tickInterval(
  start: number,
  stop: number,
  count: number,
  zone: TimeZone,
): TimeInterval | null {
  const target = Math.abs(stop - start) / count
  const units = UNITS[zone]
  const i = LADDER.findIndex((rung) => rung[2] > target)
  if (i === -1) {
    return (units[6] as CountableTimeInterval).every(tickStep(start / YEAR, stop / YEAR, count))
  }
  if (i === 0) return utcMillisecond.every(Math.max(tickStep(start, stop, count), 1))
  const below = LADDER[i - 1] as Rung
  const above = LADDER[i] as Rung
  const [unit, step] = target / below[2] < above[2] / target ? below : above
  return (units[unit] as CountableTimeInterval).every(step)
}

/**
 * [min, max] of the finite values. A single value, or a span under 1 ms, is padded by a day on
 * each side. Without values it is the day before `now`.
 */
export function inferTimeDomain(values: readonly number[], now = Date.now()): [number, number] {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const v of values) {
    if (!Number.isFinite(v)) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min > max) return [now - DAY, now]
  if (max - min < 1) return [min - DAY, max + DAY]
  return [min, max]
}

/** Rounds a domain out to the boundaries of its tick interval, as `nice` asks. */
export function niceTimeDomain(
  domain: readonly [number, number],
  zone: TimeZone,
  count = 5,
): [number, number] {
  const [d0, d1] = domain
  const interval = tickInterval(d0, d1, count, zone)
  if (!interval) return [d0, d1]
  return [+interval.floor(new Date(d0)), +interval.ceil(new Date(d1))]
}

/** A time scale over our own linear scale: d3-scale's `scaleTime` would pull in d3-time-format. */
export function timeScale(
  domain: readonly [number, number],
  range: readonly [number, number],
  zone: TimeZone = 'utc',
): TimeScale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const linear = linearScale(domain, range)
  const scale = ((value: number) => linear(value)) as TimeScale
  scale.invert = (px) => (r1 === r0 ? d0 : d0 + ((px - r0) * (d1 - d0)) / (r1 - r0))
  scale.domain = () => [d0, d1]
  scale.range = () => [r0, r1]
  scale.ticks = (count = 5) => {
    const interval = tickInterval(d0, d1, count, zone)
    // d1 + 1: the last boundary counts when it equals the domain's end.
    return interval ? interval.range(new Date(d0), new Date(d1 + 1)).map(Number) : []
  }
  scale.zone = zone
  return scale
}
