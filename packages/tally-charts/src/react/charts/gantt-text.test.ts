import { describe, expect, it } from 'vitest'
import { DAY, toTime } from '../../core/time'
import { DEFAULT_MESSAGES } from '../messages'
import {
  dayText,
  donePercent,
  type GanttTextRow,
  ganttDate,
  ganttStatus,
  ganttTexts,
  ganttValue,
  slipText,
  wholeDays,
} from './gantt-text'

const time = (value: string) => toTime(value) as number
const HOUR = 3600e3
const long = dayText('en-US', 'long')
const narrow = dayText('en-US', 'narrow')
const date = ganttDate('en-US', 'utc', [time('2026-03-01'), time('2026-04-26')])

/** A task or milestone row of the remodel schedule. */
const row = (over: Partial<GanttTextRow>): GanttTextRow => ({
  name: 'Plumbing rough-in',
  start: time('2026-03-14'),
  end: time('2026-03-21'),
  baselineStart: time('2026-03-13'),
  baselineEnd: time('2026-03-18'),
  done: 1,
  overMs: 2 * DAY,
  ...over,
})

describe('wholeDays', () => {
  it('rounds to whole days, so 47 hours across a DST change is 2', () => {
    expect(wholeDays(47 * HOUR)).toBe(2)
    expect(wholeDays(11 * HOUR)).toBe(0)
    expect(wholeDays(12 * HOUR)).toBe(1)
  })
})

describe('dayText', () => {
  it('writes long and narrow day counts, and "<1" under half a day', () => {
    expect(long(DAY)).toBe('1 day')
    expect(long(5 * DAY)).toBe('5 days')
    expect(long(2 * HOUR)).toBe('<1 day')
    expect(narrow(5 * DAY)).toBe('5d')
    expect(narrow(2 * HOUR)).toBe('<1d')
  })

  it('follows the locale', () => {
    const pl = new Intl.NumberFormat('pl-PL', { style: 'unit', unit: 'day', unitDisplay: 'long' })
    expect(dayText('pl-PL', 'long')(7 * DAY)).toBe(pl.format(7))
  })
})

describe('ganttDate', () => {
  it('drops the year when the range lies in one year', () => {
    expect(date(time('2026-03-23'))).toBe('Mar 23')
  })

  it('uses the day preset with the year for a range across two years', () => {
    const across = ganttDate('en-US', 'utc', [time('2025-12-15'), time('2026-01-20')])
    expect(across(time('2026-01-05'))).toBe('Jan 5, 2026')
  })
})

describe('slipText', () => {
  it('writes "+Nd" late and "−Nd" early, nothing under one whole day', () => {
    expect(slipText(3 * DAY, narrow)).toBe('+3d')
    expect(slipText(-2 * DAY, narrow)).toBe('−2d')
    expect(slipText(10 * HOUR, narrow)).toBeNull()
  })
})

describe('donePercent', () => {
  it('keeps a running share within 1–99 and rounds the ends', () => {
    expect(donePercent(0.5)).toBe(50)
    expect(donePercent(0.003)).toBe(1)
    expect(donePercent(0.997)).toBe(99)
    expect(donePercent(0)).toBe(0)
    expect(donePercent(1)).toBe(100)
  })
})

describe('ganttValue', () => {
  it('writes a running task as its whole percent, clamped to 1–99', () => {
    expect(ganttValue(row({ done: 0.003, overMs: 0 }), narrow, date).text).toBe('1%')
    expect(ganttValue(row({ done: 0.997, overMs: 0 }), narrow, date).text).toBe('99%')
  })

  it('writes the duration and the overrun of a task, the date and slip of a milestone', () => {
    expect(ganttValue(row({}), narrow, date)).toEqual({ text: '7d', over: '+2d' })
    const milestone = row({
      start: time('2026-03-23'),
      end: null,
      baselineStart: time('2026-03-20'),
    })
    expect(ganttValue(milestone, narrow, date)).toEqual({ text: 'Mar 23', over: '+3d' })
  })
})

describe('ganttTexts', () => {
  const words = DEFAULT_MESSAGES

  it('reads a done task with an overrun, and its tooltip lines', () => {
    expect(ganttTexts(row({}), words, long, date)).toEqual({
      label: 'Plumbing rough-in, Mar 14 – Mar 21, 7 days, done, 2 days over baseline',
      tooltip: [
        'Plumbing rough-in',
        'Mar 14 – Mar 21',
        '7 days',
        '2 days over baseline',
        'baseline Mar 13 – Mar 18',
      ],
    })
  })

  it('reads a running task with its percent and a planned one as planned', () => {
    const running = row({ done: 0.5, overMs: 0 })
    expect(ganttTexts(running, words, long, date)).toEqual({
      label: 'Plumbing rough-in, Mar 14 – Mar 21, 7 days, in progress, 50%',
      tooltip: [
        'Plumbing rough-in',
        'Mar 14 – Mar 21',
        '7 days',
        '50% done',
        'baseline Mar 13 – Mar 18',
      ],
    })
    const planned = row({ done: 0, overMs: 0, baselineStart: null, baselineEnd: null })
    expect(ganttTexts(planned, words, long, date)).toEqual({
      label: 'Plumbing rough-in, Mar 14 – Mar 21, 7 days, planned',
      tooltip: ['Plumbing rough-in', 'Mar 14 – Mar 21', '7 days'],
    })
  })

  it('reads an overrun under one whole day as none', () => {
    const texts = ganttTexts(row({ overMs: 10 * HOUR }), words, long, date)
    expect(texts.label).not.toContain('over baseline')
  })

  it('reads a milestone: date, reached or upcoming, late or early', () => {
    const milestone = (start: string, baselineStart: string | null, done: number) =>
      ganttTexts(
        row({
          name: 'Inspection',
          start: time(start),
          end: null,
          baselineStart: baselineStart === null ? null : time(baselineStart),
          baselineEnd: null,
          done,
          overMs: 0,
        }),
        words,
        long,
        date,
      )
    expect(milestone('2026-03-23', '2026-03-20', 1)).toEqual({
      label: 'Inspection, milestone, Mar 23, reached, 3 days late',
      tooltip: ['Inspection', 'Mar 23', '3 days late'],
    })
    expect(milestone('2026-04-15', '2026-04-17', 0)).toEqual({
      label: 'Inspection, milestone, Apr 15, upcoming, 2 days early',
      tooltip: ['Inspection', 'Apr 15', '2 days early'],
    })
    expect(milestone('2026-04-15', null, 0).tooltip).toEqual(['Inspection', 'Apr 15'])
  })

  it('fills the placeholders of overridden words', () => {
    const pl = { ...words, overBaseline: '{duration} ponad plan', baselineRange: 'plan {range}' }
    expect(ganttTexts(row({}), pl, long, date).tooltip.slice(-2)).toEqual([
      '2 days ponad plan',
      'plan Mar 13 – Mar 18',
    ])
  })
})

describe('ganttStatus', () => {
  it('names the status of a task, and of a milestone after "milestone"', () => {
    const words = DEFAULT_MESSAGES
    expect(ganttStatus(row({ done: 1 }), words)).toBe('done')
    expect(ganttStatus(row({ done: 0.5 }), words)).toBe('in progress')
    expect(ganttStatus(row({ done: 0 }), words)).toBe('planned')
    expect(ganttStatus(row({ end: null, done: 1 }), words)).toBe('milestone, reached')
    expect(ganttStatus(row({ end: null, done: 0 }), words)).toBe('milestone, upcoming')
  })
})
