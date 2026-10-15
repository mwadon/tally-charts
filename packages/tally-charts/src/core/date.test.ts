import { describe, expect, it } from 'vitest'
import { autoTickLabels, createDateFormatter, isDateFormat } from './date'
import { DAY, niceTimeDomain, type TimeZone, timeScale } from './time'

const at = (iso: string) => Date.parse(iso)

/** Ticks over [a, b] after nicing, with their 'auto' labels. */
function labelsOver(a: string, b: string, zone: TimeZone = 'utc') {
  const ticks = timeScale(niceTimeDomain([at(a), at(b)], zone), [0, 600], zone).ticks()
  return autoTickLabels(ticks, { zone })
}

describe("autoTickLabels ('auto' on an axis)", () => {
  it('shows the time under a day, and the day at midnight', () => {
    expect(labelsOver('2026-03-02T00:00Z', '2026-03-02T23:00Z')).toEqual([
      'Mar 2, 12:00 AM',
      '6:00 AM',
      '12:00 PM',
      '6:00 PM',
      'Mar 3',
    ])
  })

  it('shows days, with the month and year on the first tick', () => {
    expect(labelsOver('2026-03-01', '2026-04-05')).toEqual([
      'Mar 1, 2026',
      'Mar 8',
      'Mar 15',
      'Mar 22',
      'Mar 29',
      'Apr 5',
    ])
  })

  it('shows month names, and the year on a year boundary', () => {
    expect(labelsOver('2025-11-01', '2026-03-01')).toEqual([
      'Nov 2025',
      'Dec',
      '2026',
      'Feb',
      'Mar',
    ])
    expect(labelsOver('2025-01-06', '2026-12-28')).toEqual([
      'Jan 2025',
      'Apr',
      'Jul',
      'Oct',
      '2026',
      'Apr',
      'Jul',
      'Oct',
      '2027',
    ])
  })

  it('shows years for long spans', () => {
    expect(labelsOver('2021-01-01', '2025-12-01')).toEqual([
      '2021',
      '2022',
      '2023',
      '2024',
      '2025',
      '2026',
    ])
  })

  it('adds seconds under a minute', () => {
    const start = at('2026-03-02T10:00:00Z')
    expect(autoTickLabels([start, start + 15e3, start + 30e3])).toEqual([
      'Mar 2, 10:00:00 AM',
      '10:00:15 AM',
      '10:00:30 AM',
    ])
  })

  it('labels local midnights in the local zone', () => {
    // Europe/Warsaw (vitest.config.ts): local midnight on Mar 30 is 22:00 UTC the day before.
    expect(labelsOver('2026-03-27T00:00:00+01:00', '2026-04-01T00:00:00+02:00', 'local')).toEqual([
      'Mar 27, 2026',
      'Mar 28',
      'Mar 29',
      'Mar 30',
      'Mar 31',
      'Apr',
    ])
  })

  it('keeps a day grain across a DST change in the local zone', () => {
    // 23h (spring forward) and 25h (fall back) steps are still days.
    expect(labelsOver('2026-03-29T00:00:00+01:00', '2026-04-02T00:00:00+02:00', 'local')[0]).toBe(
      'Mar 29, 2026',
    )
    expect(labelsOver('2026-10-25T00:00:00+02:00', '2026-10-29T00:00:00+01:00', 'local')[0]).toBe(
      'Oct 25, 2026',
    )
  })

  it('writes an empty string for a value outside the Date range', () => {
    expect(autoTickLabels([1e16, 1e16 + DAY])).toEqual(['', ''])
  })

  it('writes a tick in full when its field cannot show what changed since the tick before', () => {
    // Quarterly ticks thinned to every other one: the "2026" tick is gone, so Apr 2026 says so.
    const kept = ['2025-04-01', '2025-10-01', '2026-04-01', '2026-10-01'].map(at)
    expect(autoTickLabels(kept, { step: 92 * DAY })).toEqual(['Apr 2025', 'Oct', 'Apr 2026', 'Oct'])
    // Hourly ticks thinned past midnight carry the new day.
    const hours = ['2026-03-02T15:00Z', '2026-03-02T21:00Z', '2026-03-03T03:00Z'].map(at)
    expect(autoTickLabels(hours, { step: 3 * 36e5 })).toEqual([
      'Mar 2, 3:00 PM',
      '9:00 PM',
      'Mar 3, 3:00 AM',
    ])
  })

  it('returns nothing for no ticks', () => {
    expect(autoTickLabels([])).toEqual([])
  })
})

describe('createDateFormatter', () => {
  const may10 = at('2026-05-10T15:30:00Z')

  it('writes the presets', () => {
    expect(createDateFormatter('day')(may10)).toBe('May 10, 2026')
    expect(createDateFormatter('month')(may10)).toBe('May 2026')
    expect(createDateFormatter('year')(may10)).toBe('2026')
    expect(createDateFormatter('quarter')(may10)).toBe('Q2 2026')
    expect(createDateFormatter('quarter')(at('2026-01-01'))).toBe('Q1 2026')
    expect(createDateFormatter('quarter')(at('2026-12-31'))).toBe('Q4 2026')
  })

  it("writes 'auto' at the grain of the data's step", () => {
    expect(createDateFormatter('auto', { step: 36e5 })(may10)).toBe('May 10, 3:30 PM')
    expect(createDateFormatter('auto', { step: DAY })(may10)).toBe('May 10, 2026')
    expect(createDateFormatter('auto', { step: 30 * DAY })(may10)).toBe('May 2026')
    expect(createDateFormatter('auto', { step: 365 * DAY })(may10)).toBe('2026')
    expect(createDateFormatter()(may10)).toBe('May 10, 2026')
  })

  it('takes Intl options, a locale and a zone', () => {
    expect(createDateFormatter({ weekday: 'long' })(may10)).toBe('Sunday')
    expect(createDateFormatter('month', { locale: 'de-DE' })(may10)).toBe('Mai 2026')
    // 23:30 UTC on Dec 31 is already Jan 1 in Warsaw.
    const late = at('2026-12-31T23:30:00Z')
    expect(createDateFormatter('year', { zone: 'utc' })(late)).toBe('2026')
    expect(createDateFormatter('year', { zone: 'local' })(late)).toBe('2027')
    expect(createDateFormatter('quarter', { zone: 'local' })(late)).toBe('Q1 2027')
  })

  it('writes an empty string for a non-finite value', () => {
    expect(createDateFormatter('day')(Number.NaN)).toBe('')
    expect(createDateFormatter('quarter')(Number.NaN)).toBe('')
  })

  it('writes an empty string for a value outside the Date range, without throwing', () => {
    for (const spec of ['auto', 'day', 'month', 'quarter', 'year', { weekday: 'long' }] as const) {
      expect(createDateFormatter(spec)(1e16)).toBe('')
      expect(createDateFormatter(spec)(-1e16)).toBe('')
    }
  })
})

describe('isDateFormat', () => {
  it('tells date specs from number specs', () => {
    expect(isDateFormat('auto')).toBe(true)
    expect(isDateFormat('quarter')).toBe(true)
    expect(isDateFormat({ month: 'long' })).toBe(true)
    expect(isDateFormat('percent')).toBe(false)
    expect(isDateFormat({ preset: 'percent' })).toBe(false)
    expect(isDateFormat((v: number) => String(v))).toBe(false)
    expect(isDateFormat(undefined)).toBe(false)
  })
})
