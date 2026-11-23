import { createDateFormatter, type DateFormatter } from '../../core/date'
import { DAY, type TimeZone } from '../../core/time'

/** Whole days in `ms`, rounded: 47 hours across a DST change is 2 days. */
export const wholeDays = (ms: number): number => Math.round(ms / DAY)

/**
 * A day count in `locale`: "5d" ('narrow', value labels) or "5 days" ('long', the tooltip, the
 * announcement and the table). Under half a day it reads "<1d" / "<1 day".
 */
export function dayText(locale: string, unitDisplay: 'narrow' | 'long'): (ms: number) => string {
  const f = new Intl.NumberFormat(locale, { style: 'unit', unit: 'day', unitDisplay })
  return (ms) => {
    const days = wholeDays(ms)
    return days < 1 ? `<${f.format(1)}` : f.format(days)
  }
}

const yearOf = (ms: number, zone: TimeZone) =>
  zone === 'utc' ? new Date(ms).getUTCFullYear() : new Date(ms).getFullYear()

/**
 * Dates in labels, the tooltip and announcements: month and day when `range` lies in one year of
 * `zone`, otherwise the 'day' preset with the year.
 */
export function ganttDate(
  locale: string,
  zone: TimeZone,
  range: readonly [number, number],
): DateFormatter {
  const sameYear = yearOf(range[0], zone) === yearOf(range[1], zone)
  return createDateFormatter(sameYear ? { month: 'short', day: 'numeric' } : 'day', {
    locale,
    zone,
  })
}

/** "+2d" late, "−2d" (U+2212) early; null under one whole day. */
export function slipText(ms: number, days: (ms: number) => string): string | null {
  if (wholeDays(Math.abs(ms)) < 1) return null
  return `${ms > 0 ? '+' : '−'}${days(Math.abs(ms))}`
}

/** A value label: the muted text, and the overrun or late slip drawn in the loss text colour. */
export interface GanttValue {
  text: string
  over: string | null
}

export interface GanttValueRow {
  start: number
  /** null for a milestone. */
  end: number | null
  baselineStart: number | null
  baselineEnd: number | null
  done: number
  /** Duration minus baseline duration, 0 without a baseline. */
  overMs: number
}

/**
 * Task: its duration ("5d"), or its done share ("50%") while running, plus "+Nd" for an overrun of
 * a whole day or more. Milestone: its date, plus the slip against its baseline: "+3d" late (loss),
 * "−2d" early (muted).
 */
export function ganttValue(
  row: GanttValueRow,
  days: (ms: number) => string,
  date: DateFormatter,
): GanttValue {
  if (row.end === null) {
    const slip = row.baselineStart === null ? null : slipText(row.start - row.baselineStart, days)
    const late = row.baselineStart !== null && row.start > row.baselineStart
    if (slip === null) return { text: date(row.start), over: null }
    return late
      ? { text: date(row.start), over: slip }
      : { text: `${date(row.start)} ${slip}`, over: null }
  }
  const running = row.done > 0 && row.done < 1
  const text = running
    ? `${Math.min(99, Math.max(1, Math.round(row.done * 100)))}%`
    : days(row.end - row.start)
  return { text, over: row.overMs > 0 ? slipText(row.overMs, days) : null }
}
