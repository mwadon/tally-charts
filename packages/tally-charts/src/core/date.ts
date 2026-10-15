import {
  type TimeInterval,
  timeDay,
  timeMonth,
  timeYear,
  unixDay,
  utcMonth,
  utcYear,
} from 'd3-time'
import { DEFAULT_LOCALE } from './format'
import { DAY, type TimeZone } from './time'

/**
 * How dates are written: `'auto'` (the default on a time axis), a preset, or any
 * `Intl.DateTimeFormatOptions`. `'day'` is "Jan 5, 2026", `'month'` "Jan 2026", `'quarter'`
 * "Q1 2026" and `'year'` "2026".
 */
export type DateFormatSpec =
  | 'auto'
  | 'day'
  | 'month'
  | 'quarter'
  | 'year'
  | Intl.DateTimeFormatOptions

export interface DateFormatOptions {
  /** Default `en-US`, or the `ChartsProvider` locale through `useFormat()`. */
  locale?: string
  /** Default 'utc'. */
  zone?: TimeZone
  /**
   * Typical distance between the values in ms. `'auto'` writes the fields that tell such values
   * apart: the time under a day, the day under four weeks, the month under a year, else the
   * year. Default: one day.
   */
  step?: number
}

/** Formats one date, given in epoch ms. Non-finite values give an empty string. */
export type DateFormatter = (ms: number) => string

const HOUR = DAY / 24

/** Calendar grains by index, coarsest first: 0 year, 1 month, 2 day, 3 time. */
const GRAINS: readonly unknown[] = ['year', 'month', 'day', 'time']
const DATE_PRESETS: ReadonlySet<unknown> = new Set(['auto', 'day', 'month', 'quarter', 'year'])

/** True for a `DateFormatSpec`; false for a number `FormatSpec` and for functions. */
export function isDateFormat(spec: unknown): spec is DateFormatSpec {
  return typeof spec === 'string'
    ? DATE_PRESETS.has(spec)
    : typeof spec === 'object' && spec !== null && !('preset' in spec)
}

/** The grain (an index into GRAINS) that tells values `step` apart. */
function grainOf(step: number): number {
  // An hour of slack: in a local zone a day or a month can be 23h or an hour shorter at DST.
  if (!(step < 365 * DAY - HOUR)) return 0
  if (step >= 28 * DAY - HOUR) return 1
  return step >= DAY - HOUR ? 2 : 3
}

/**
 * The coarsest grain that differs between `ms` and
 * `prev` in `zone`; without `prev`, the coarsest boundary `ms` sits on.
 */
function levelOf(ms: number, zone: TimeZone, prev?: number): number {
  const at = (u: TimeInterval, t: number) => +u.floor(new Date(t))
  const i = (
    zone === 'utc' ? [utcYear, utcMonth, unixDay] : [timeYear, timeMonth, timeDay]
  ).findIndex((u) => (prev === undefined ? at(u, ms) === ms : at(u, ms) !== at(u, prev)))
  return i < 0 ? 3 : i
}

/** Every field a lone value needs at each grain, e.g. "Jan 2026" for monthly data. */
const FULL: readonly Intl.DateTimeFormatOptions[] = [
  { year: 'numeric' },
  { month: 'short', year: 'numeric' },
  { month: 'short', day: 'numeric', year: 'numeric' },
  { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
]

/** The one field a tick after the first shows at a boundary of each grain. */
const TICK: readonly Intl.DateTimeFormatOptions[] = [
  { year: 'numeric' },
  { month: 'short' },
  { month: 'short', day: 'numeric' },
  { hour: 'numeric', minute: '2-digit' },
]

/** Adds seconds under a minute, and milliseconds under a second, to time fields. */
function withSeconds(fields: Intl.DateTimeFormatOptions, step: number): Intl.DateTimeFormatOptions {
  if (!('hour' in fields) || !(step < 6e4)) return fields
  return step < 1e3
    ? { ...fields, second: '2-digit', fractionalSecondDigits: 3 }
    : { ...fields, second: '2-digit' }
}

/** False for NaN and for epoch values outside the Date range, which Intl would throw on. */
function validDate(d: Date): boolean {
  return !Number.isNaN(d.getTime())
}

function intl(locale: string, zone: TimeZone, fields: Intl.DateTimeFormatOptions) {
  // 'local' leaves the zone unset: the runtime's own zone.
  return new Intl.DateTimeFormat(locale, zone === 'utc' ? { ...fields, timeZone: 'UTC' } : fields)
}

/** A formatter for single dates: tooltip headers, announcements and data-table cells. */
export function createDateFormatter(
  spec: DateFormatSpec = 'auto',
  { locale = DEFAULT_LOCALE, zone = 'utc', step = DAY }: DateFormatOptions = {},
): DateFormatter {
  if (spec === 'quarter') {
    // Intl has no quarter field, so the quarter comes from the month.
    const year = intl(locale, zone, { year: 'numeric' })
    return (ms) => {
      const d = new Date(ms)
      if (!validDate(d)) return ''
      const month = zone === 'utc' ? d.getUTCMonth() : d.getMonth()
      return `Q${Math.floor(month / 3) + 1} ${year.format(d)}`
    }
  }
  const fields =
    typeof spec === 'object'
      ? spec
      : spec === 'auto'
        ? withSeconds(FULL[grainOf(step)] as Intl.DateTimeFormatOptions, step)
        : (FULL[GRAINS.indexOf(spec)] as Intl.DateTimeFormatOptions)
  const f = intl(locale, zone, fields)
  return (ms) => (validDate(new Date(ms)) ? f.format(ms) : '')
}

/**
 * Multi-scale labels for time ticks. The first tick carries the full context ("Jan 2026"). Each
 * later tick shows the coarsest field that changes at its boundary: the year on a year
 * boundary, the month name on a month boundary, the day otherwise, and the time when the ticks
 * are under a day apart. A tick whose field can't show what changed since the tick before it
 * (an axis thinned past the "2026" tick, so "Apr" follows "Oct") is written in full. `step` is
 * the distance between the ticks before thinning; default: the first two ticks' distance.
 */
export function autoTickLabels(
  ticks: readonly number[],
  { locale = DEFAULT_LOCALE, zone = 'utc', step: given }: DateFormatOptions = {},
): string[] {
  const [first, second] = ticks
  if (first === undefined) return []
  const step = given ?? (second === undefined ? Number.NaN : second - first)
  const grain = Number.isNaN(step) ? levelOf(first, zone) : grainOf(step)
  const full = FULL[grain] as Intl.DateTimeFormatOptions
  // One Intl formatter per field set, keyed by the FULL or TICK entry it was built from.
  const formats = new Map<Intl.DateTimeFormatOptions, Intl.DateTimeFormat>()
  const format = (fields: Intl.DateTimeFormatOptions, ms: number) => {
    let f = formats.get(fields)
    if (!f) {
      f = intl(locale, zone, withSeconds(fields, step))
      formats.set(fields, f)
    }
    return validDate(new Date(ms)) ? f.format(ms) : ''
  }
  return ticks.map((ms, i) => {
    // Never finer than the ticks' grain: a monthly tick reads as a month.
    const field = Math.min(levelOf(ms, zone), grain)
    // The coarsest field the tick shows: a day tick ("Jan 5") also shows the month.
    const shown = field === 2 ? 1 : field
    // The first tick, and a tick that can't show what changed, are written in full.
    return format(
      i && levelOf(ms, zone, ticks[i - 1]) >= shown
        ? (TICK[field] as Intl.DateTimeFormatOptions)
        : full,
      ms,
    )
  })
}
