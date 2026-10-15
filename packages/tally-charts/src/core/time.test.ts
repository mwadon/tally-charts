import { describe, expect, it } from 'vitest'
import { DAY, inferTimeDomain, niceTimeDomain, type TimeZone, timeScale, toTime } from './time'

const at = (iso: string) => Date.parse(iso)
const iso = (values: readonly number[]) => values.map((v) => new Date(v).toISOString())

/** Ticks of a scale over [a, b] with the domain niced first, as createScale does. */
function ticksOver(a: string, b: string, zone: TimeZone = 'utc', count?: number) {
  const scale = timeScale(niceTimeDomain([at(a), at(b)], zone, count), [0, 600], zone)
  return scale.ticks(count)
}

describe('toTime', () => {
  it('reads dates, epoch ms and ISO strings', () => {
    expect(toTime(new Date('2026-01-05T12:00:00Z'))).toBe(at('2026-01-05T12:00:00Z'))
    expect(toTime(1767225600000)).toBe(1767225600000)
    expect(toTime('2026-03-01T10:30:00Z')).toBe(at('2026-03-01T10:30:00Z'))
    expect(toTime(0)).toBe(0)
  })

  it('reads a date-only ISO string as UTC midnight', () => {
    expect(toTime('2026-01-01')).toBe(Date.UTC(2026, 0, 1))
  })

  it('rejects everything else', () => {
    for (const bad of [
      '',
      'soon',
      new Date(Number.NaN),
      Number.NaN,
      Number.POSITIVE_INFINITY,
      null,
      undefined,
      true,
      {},
    ]) {
      expect(toTime(bad)).toBeUndefined()
    }
  })
})

describe('inferTimeDomain', () => {
  it('spans the smallest and largest value', () => {
    expect(inferTimeDomain([at('2026-03-01'), at('2026-01-01'), Number.NaN])).toEqual([
      at('2026-01-01'),
      at('2026-03-01'),
    ])
  })

  it('pads a single value, or a span under 1 ms, by a day on each side', () => {
    const t = at('2026-01-05')
    expect(inferTimeDomain([t, t])).toEqual([t - DAY, t + DAY])
    expect(inferTimeDomain([t, t + 0.5])).toEqual([t - DAY, t + 0.5 + DAY])
  })

  it('falls back to the day before now without values', () => {
    expect(inferTimeDomain([], 1_000_000_000)).toEqual([1_000_000_000 - DAY, 1_000_000_000])
  })
})

describe('time ticks', () => {
  // Each rung is picked when the span is five of its steps (count 5), and its ticks sit that
  // far apart: one row per rung of the ladder.
  it.each([
    ['1s', 1e3],
    ['5s', 5e3],
    ['15s', 15e3],
    ['30s', 3e4],
    ['1min', 6e4],
    ['5min', 3e5],
    ['15min', 9e5],
    ['30min', 18e5],
    ['1h', 36e5],
    ['3h', 108e5],
    ['6h', 216e5],
    ['12h', 432e5],
    ['1d', DAY],
    ['2d', 2 * DAY],
  ])('uses the %s rung for five of its steps', (_, step) => {
    const start = at('2026-03-02T00:00:00Z')
    const ticks = timeScale([start, start + 5 * step], [0, 500]).ticks()
    expect(ticks).toHaveLength(6)
    expect(ticks.slice(1).map((t, i) => t - (ticks[i] as number))).toEqual(Array(5).fill(step))
  })

  it('uses weeks starting on Sunday', () => {
    const ticks = ticksOver('2026-03-01', '2026-04-05')
    expect(iso(ticks)).toEqual([
      '2026-03-01T00:00:00.000Z',
      '2026-03-08T00:00:00.000Z',
      '2026-03-15T00:00:00.000Z',
      '2026-03-22T00:00:00.000Z',
      '2026-03-29T00:00:00.000Z',
      '2026-04-05T00:00:00.000Z',
    ])
    expect(ticks.every((t) => new Date(t).getUTCDay() === 0)).toBe(true)
  })

  it('uses month starts, quarter starts and years for longer spans', () => {
    expect(iso(ticksOver('2026-01-01', '2026-06-01'))).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-02-01T00:00:00.000Z',
      '2026-03-01T00:00:00.000Z',
      '2026-04-01T00:00:00.000Z',
      '2026-05-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
    ])
    expect(iso(ticksOver('2025-01-06', '2026-12-28')).slice(0, 3)).toEqual([
      '2025-01-01T00:00:00.000Z',
      '2025-04-01T00:00:00.000Z',
      '2025-07-01T00:00:00.000Z',
    ])
    expect(iso(ticksOver('2021-01-01', '2025-12-01'))).toEqual([
      '2021-01-01T00:00:00.000Z',
      '2022-01-01T00:00:00.000Z',
      '2023-01-01T00:00:00.000Z',
      '2024-01-01T00:00:00.000Z',
      '2025-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    ])
  })

  it('uses year multiples for decades and milliseconds below a second', () => {
    expect(iso(ticksOver('1990-01-01', '2030-01-01'))).toEqual([
      '1990-01-01T00:00:00.000Z',
      '2000-01-01T00:00:00.000Z',
      '2010-01-01T00:00:00.000Z',
      '2020-01-01T00:00:00.000Z',
      '2030-01-01T00:00:00.000Z',
    ])
    const start = at('2026-03-02T10:00:00.000Z')
    expect(timeScale([start, start + 40], [0, 400]).ticks()).toEqual([
      start,
      start + 10,
      start + 20,
      start + 30,
      start + 40,
    ])
  })

  it('crosses a year on month boundaries', () => {
    expect(iso(ticksOver('2025-11-01', '2026-03-01'))).toEqual([
      '2025-11-01T00:00:00.000Z',
      '2025-12-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
      '2026-02-01T00:00:00.000Z',
      '2026-03-01T00:00:00.000Z',
    ])
  })

  it('ticks a day span every six hours, niced to whole days', () => {
    const domain = niceTimeDomain([at('2026-03-02T00:00Z'), at('2026-03-02T23:00Z')], 'utc')
    expect(iso(domain)).toEqual(['2026-03-02T00:00:00.000Z', '2026-03-03T00:00:00.000Z'])
    const scale = timeScale(domain, [0, 600])
    expect(scale.ticks().map((t) => scale(t))).toEqual([0, 150, 300, 450, 600])
  })

  it('has one tick for a zero span and none for an invalid one', () => {
    const t = at('2026-03-02')
    expect(timeScale([t, t], [0, 100]).ticks()).toEqual([t])
    expect(timeScale([Number.NaN, t], [0, 100]).ticks()).toEqual([])
  })
})

// vitest.config.ts runs every test in Europe/Warsaw, where clocks go forward on 2026-03-29.
describe("the 'local' zone across a DST change", () => {
  it('ticks local midnights, one 23-hour day apart', () => {
    const ticks = ticksOver('2026-03-26T00:00:00+01:00', '2026-04-01T00:00:00+02:00', 'local')
    expect(ticks.map((t) => new Date(t).getHours())).toEqual([0, 0, 0, 0, 0, 0, 0])
    expect(ticks.map((t) => new Date(t).getDate())).toEqual([26, 27, 28, 29, 30, 31, 1])
    const gaps = ticks.slice(1).map((t, i) => (t - (ticks[i] as number)) / 36e5)
    expect(gaps).toEqual([24, 24, 24, 23, 24, 24])
  })

  it('ticks local hours across the skipped hour', () => {
    const ticks = ticksOver('2026-03-29T00:00:00+01:00', '2026-03-29T12:00:00+02:00', 'local')
    expect(ticks.map((t) => new Date(t).getHours())).toEqual([0, 3, 6, 9, 12])
    // 02:00 doesn't exist that night, so the first gap is two real hours.
    const gaps = ticks.slice(1).map((t, i) => (t - (ticks[i] as number)) / 36e5)
    expect(gaps).toEqual([2, 3, 3, 3])
  })

  it('keeps UTC ticks on UTC midnights on the same days', () => {
    const ticks = ticksOver('2026-03-26', '2026-04-01')
    expect(ticks.every((t) => new Date(t).getUTCHours() === 0)).toBe(true)
    expect(ticks.slice(1).map((t, i) => t - (ticks[i] as number))).toEqual(Array(6).fill(DAY))
  })
})

describe('timeScale', () => {
  it('maps epoch ms to px and back', () => {
    const scale = timeScale([at('2026-01-01'), at('2026-01-11')], [0, 1000])
    expect(scale(at('2026-01-06'))).toBe(500)
    expect(scale.invert(250)).toBe(at('2026-01-03T12:00:00Z'))
    expect(scale.domain()).toEqual([at('2026-01-01'), at('2026-01-11')])
    expect(scale.range()).toEqual([0, 1000])
    expect(scale.zone).toBe('utc')
  })

  it('inverts a zero-width range to the domain start', () => {
    const scale = timeScale([at('2026-01-01'), at('2026-01-11')], [0, 0])
    expect(scale.invert(0)).toBe(at('2026-01-01'))
  })
})
