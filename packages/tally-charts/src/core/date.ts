import { timeDay, timeMonth, timeYear, unixDay, utcMonth, utcYear } from 'd3-time'
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

type Grain = 'year' | 'month' | 'day' | 'time'

const GRAINS: readonly Grain[] = ['year', 'month', 'day', 'time']
const DATE_PRESETS: ReadonlySet<unknown> = new Set(['auto', 'day', 'month', 'quarter', 'year'])

/** True for a `DateFormatSpec`; false for a number `FormatSpec` and for functions. */
export function isDateFormat(spec: unknown): spec is DateFormatSpec {
  return typeof spec === 'string'
    ? DATE_PRESETS.has(spec)
    : typeof spec === 'object' && spec !== null && !('preset' in spec)
}

function grainOf(step: number): Grain {
  // An hour of slack: in a local zone a day or a month can be 23h or an hour shorter at DST.
  if (!(step < 365 * DAY - HOUR)) return 'year'
  if (step >= 28 * DAY - HOUR) return 'month'
  return step >= DAY - HOUR ? 'day' : 'time'
}

/** The coarsest calendar boundary `ms` sits on in `zone`. */
function boundaryOf(ms: number, zone: TimeZone): Grain {
  const d = new Date(ms)
  const [year, month, day] =
    zone === 'utc' ? [utcYear, utcMonth, unixDay] : [timeYear, timeMonth, timeDay]
  if (+year.floor(d) === ms) return 'year'
  if (+month.floor(d) === ms) return 'month'
  return +day.floor(d) === ms ? 'day' : 'time'
}

/** Every field a lone value needs, e.g. "Jan 2026" for monthly data. */
const FULL: Record<Grain, Intl.DateTimeFormatOptions> = {
  year: { year: 'numeric' },
  month: { month: 'short', year: 'numeric' },
  day: { month: 'short', day: 'numeric', year: 'numeric' },
  time: { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
}

/** The one field a tick after the first shows at a boundary of this grain. */
const TICK: Record<Grain, Intl.DateTimeFormatOptions> = {
  year: { year: 'numeric' },
  month: { month: 'short' },
  day: { month: 'short', day: 'numeric' },
  time: { hour: 'numeric', minute: '2-digit' },
}

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
        ? withSeconds(FULL[grainOf(step)], step)
        : FULL[spec]
  const f = intl(locale, zone, fields)
  return (ms) => (validDate(new Date(ms)) ? f.format(ms) : '')
}

/**
 * Multi-scale labels for time ticks. The first tick carries the full context ("Jan 2026"). Each
 * later tick shows the coarsest field that changes at its boundary: the year on a year
 * boundary, the month name on a month boundary, the day otherwise, and the time when the ticks
 * are under a day apart.
 */
export function autoTickLabels(
  ticks: readonly number[],
  { locale = DEFAULT_LOCALE, zone = 'utc' }: Omit<DateFormatOptions, 'step'> = {},
): string[] {
  const [first, second] = ticks
  if (first === undefined) return []
  const step = second === undefined ? Number.NaN : second - first
  const grain = second === undefined ? boundaryOf(first, zone) : grainOf(step)
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
    if (i === 0) return format(FULL[grain], ms)
    // Never finer than the ticks' grain: a monthly tick reads as a month.
    const field = GRAINS[Math.min(GRAINS.indexOf(boundaryOf(ms, zone)), GRAINS.indexOf(grain))]
    return format(TICK[field ?? grain], ms)
  })
}
