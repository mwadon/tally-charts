import { describe, expect, it, vi } from 'vitest'
import { buildXRows, minGap, withBreaks, xColumn, xScaleOf } from './x-rows'

type Week = { week: string | null; at: string; a: number | null; b: number | string }

const weeks: Week[] = [
  { week: 'W1', at: '2026-01-12', a: 180, b: 120 },
  { week: null, at: 'soon', a: 190, b: 125 },
  { week: 'W3', at: '2026-01-05', a: null, b: 'x' },
  { week: 'W1', at: '2026-01-12', a: 210, b: 130 },
]

describe('buildXRows', () => {
  it('keys categories, reads every getter and breaks after the row before a missing x', () => {
    const warn = vi.fn()
    const rows = buildXRows(weeks, 'week', ['a', (d) => d.b], warn, 'AreaChart', 'area')
    expect(rows.map((r) => [r.key, r.index, r.values, r.gapAfter])).toEqual([
      ['W1', 0, [180, 120], true],
      ['W3', 2, [Number.NaN, Number.NaN], undefined],
    ])
    expect(rows[0]?.label).toBe('W1')
    expect(rows[0]?.time).toBeNaN()
    expect(warn.mock.calls).toEqual([
      ['area-x-missing', 'AreaChart skipped a missing x value at index 1.'],
      ['area-x-repeated', 'AreaChart skipped a repeated x value "W1" at index 3.'],
    ])
  })

  it('sorts dates, keys them by ISO string and warns for an x that is not a date', () => {
    const warn = vi.fn()
    const rows = buildXRows(weeks, { type: 'time', field: 'at' }, ['a'], warn, 'AreaChart', 'area')
    expect(rows.map((r) => [r.key, r.index])).toEqual([
      ['2026-01-05T00:00:00.000Z', 2],
      ['2026-01-12T00:00:00.000Z', 0],
    ])
    expect(rows[1]?.time).toBe(Date.UTC(2026, 0, 12))
    expect(warn.mock.calls[0]).toEqual([
      'area-x-missing',
      'AreaChart skipped an x value that is not a date at index 1.',
    ])
  })
})

describe('withBreaks', () => {
  it('adds a row of no values after each row a skipped one followed', () => {
    const rows = buildXRows(weeks.slice(0, 3), 'week', ['a'], vi.fn(), 'AreaChart', 'area')
    const drawn = withBreaks(rows)
    expect(drawn.map((r) => [r.key, r.values])).toEqual([
      ['W1', [180]],
      ['W1', []],
      ['W3', [Number.NaN]],
    ])
  })
})

describe('minGap', () => {
  it('is the smallest step between sorted values, Infinity for fewer than two', () => {
    expect(minGap([0, 10, 13, 30])).toBe(3)
    expect(minGap([5])).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('xScaleOf and xColumn', () => {
  it('point scale on the key for categories, time scale on the time for dates', () => {
    expect(xScaleOf<Week>('week')).toEqual({ type: 'point', field: 'key' })
    expect(xScaleOf<Week>({ type: 'time', field: 'at', nice: false })).toEqual({
      type: 'time',
      field: 'time',
      domain: undefined,
      nice: false,
      zone: 'utc',
    })
  })

  it('heads the x column with the field name, else the message', () => {
    expect(xColumn<Week>('week', {}).header).toBe('Week')
    expect(xColumn<Week>({ type: 'time', field: (d) => d.at }, { headerDate: 'Day' }).header).toBe(
      'Day',
    )
  })
})
