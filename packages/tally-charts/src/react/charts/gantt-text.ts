import { createDateFormatter, type DateFormatter } from '../../core/date'
import { DAY, type TimeZone } from '../../core/time'
import { type ChartMessages, formatMessage } from '../messages'

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
  const text = isRunning(row.done) ? `${donePercent(row.done)}%` : days(row.end - row.start)
  return { text, over: row.overMs > 0 ? slipText(row.overMs, days) : null }
}

const isRunning = (done: number) => done > 0 && done < 1

/** A done share as a whole percent. A running task stays within 1–99, so it never reads 0 or 100. */
export function donePercent(done: number): number {
  const percent = Math.round(done * 100)
  return isRunning(done) ? Math.min(99, Math.max(1, percent)) : percent
}

/** "Mar 14 – Mar 21". */
const rangeText = (start: number, end: number, date: DateFormatter): string =>
  `${date(start)} – ${date(end)}`

/** The messages the tooltip, the announcement and the data table speak. */
export type GanttWords = Pick<
  ChartMessages,
  | 'statusDone'
  | 'statusInProgress'
  | 'statusPlanned'
  | 'milestone'
  | 'statusReached'
  | 'statusUpcoming'
  | 'percentDone'
  | 'overBaseline'
  | 'late'
  | 'early'
  | 'baselineRange'
>

export interface GanttTextRow extends GanttValueRow {
  name: string
}

/** A task's status word; a milestone's "milestone, reached" or "milestone, upcoming". */
export function ganttStatus(row: Pick<GanttValueRow, 'end' | 'done'>, words: GanttWords): string {
  if (row.end === null) {
    return `${words.milestone}, ${row.done >= 1 ? words.statusReached : words.statusUpcoming}`
  }
  return row.done >= 1
    ? words.statusDone
    : row.done <= 0
      ? words.statusPlanned
      : words.statusInProgress
}

/**
 * The announcement `label` and the tooltip lines of a row. Task: name, range, long day count, then
 * the status ("in progress, 50%") and an overrun of a whole day or more; the tooltip has the done
 * share of a running task and the baseline's range instead of the status. Milestone: name,
 * "milestone", date, reached or upcoming, and a slip of a whole day or more ("3 days late").
 */
export function ganttTexts(
  row: GanttTextRow,
  words: GanttWords,
  days: (ms: number) => string,
  date: DateFormatter,
): { label: string; tooltip: string[] } {
  if (row.end === null) {
    const slipMs = row.baselineStart === null ? 0 : row.start - row.baselineStart
    const slip =
      wholeDays(Math.abs(slipMs)) < 1
        ? null
        : formatMessage(slipMs > 0 ? words.late : words.early, { duration: days(Math.abs(slipMs)) })
    const reached = row.done >= 1 ? words.statusReached : words.statusUpcoming
    const when = date(row.start)
    return {
      label: [row.name, words.milestone, when, reached, ...(slip ? [slip] : [])].join(', '),
      tooltip: [row.name, when, ...(slip ? [slip] : [])],
    }
  }
  const range = rangeText(row.start, row.end, date)
  const length = days(row.end - row.start)
  const over =
    wholeDays(row.overMs) >= 1
      ? formatMessage(words.overBaseline, { duration: days(row.overMs) })
      : null
  const percent = `${donePercent(row.done)}%`
  const status = isRunning(row.done)
    ? `${words.statusInProgress}, ${percent}`
    : ganttStatus(row, words)
  const baseline =
    row.baselineStart !== null && row.baselineEnd !== null
      ? formatMessage(words.baselineRange, {
          range: rangeText(row.baselineStart, row.baselineEnd, date),
        })
      : null
  return {
    label: [row.name, range, length, status, ...(over ? [over] : [])].join(', '),
    tooltip: [
      row.name,
      range,
      length,
      ...(isRunning(row.done) ? [formatMessage(words.percentDone, { value: percent })] : []),
      ...(over ? [over] : []),
      ...(baseline ? [baseline] : []),
    ],
  }
}
