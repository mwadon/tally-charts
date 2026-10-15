import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDateFormatter } from './date'
import {
  cellBounds,
  normalizeRow,
  parseCell,
  projectionAt,
  runwayCells,
  runwayDate,
  runwayFacts,
  runwayForecast,
  statusLines,
} from './runway'
import { binLevels } from './thresholds'

const H = 36e5
const D = 24 * H
const start = Date.UTC(2026, 9, 9, 11, 22)
const reset = start + 7 * D
const at = (share: number) => start + share * 7 * D

describe('runwayForecast', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reproduces the reference: 85% used at 81% of the window runs out about 8 h before reset', () => {
    const f = runwayForecast({ used: 0.85, windowStart: start, resetAt: reset, now: at(0.81) })
    expect(f.elapsed).toBeCloseTo(0.81, 6)
    expect(f.paceRatio).toBeCloseTo(0.85 / 0.81, 6)
    expect(f.usedAtReset).toBeCloseTo(0.85 + (0.85 / 0.81) * 0.19, 6)
    const runsOut = at(0.81) + (0.15 * 0.81 * 7 * D) / 0.85
    expect(f.runsOutAt?.getTime()).toBeCloseTo(runsOut, -1)
    expect(f.lockedMs).toBeCloseTo(reset - runsOut, -1)
    expect(f.lockedMs / H).toBeGreaterThan(7.5)
    expect(f.lockedMs / H).toBeLessThan(8.5)
    expect(f.projection.map((p) => [p.at.getTime(), p.used])).toEqual([
      [at(0.81), 0.85],
      [f.runsOutAt?.getTime(), 1],
    ])
    expect(f.resetAt.getTime()).toBe(reset)
  })

  it('projects to reset when the allowance lasts', () => {
    const f = runwayForecast({ used: 0.2, windowStart: start, resetAt: reset, now: at(0.5) })
    expect(f.runsOutAt).toBeUndefined()
    expect(f.usedAtReset).toBeCloseTo(0.4, 9)
    expect(f.lockedMs).toBe(0)
    expect(f.projection.at(-1)?.at.getTime()).toBe(reset)
    expect(f.projection.at(-1)?.used).toBeCloseTo(0.4, 9)
  })

  it('takes an explicit pace in share per ms', () => {
    const f = runwayForecast({
      used: 0.5,
      windowStart: start,
      resetAt: reset,
      now: at(0.5),
      pace: 0.25 / D,
    })
    expect(f.runsOutAt?.getTime()).toBe(at(0.5) + 2 * D)
    expect(f.paceRatio).toBeCloseTo(0.25 * 7, 9)
  })

  it('runs out now when the allowance is already used up', () => {
    const f = runwayForecast({ used: 1.02, windowStart: start, resetAt: reset, now: at(0.9) })
    expect(f.runsOutAt?.getTime()).toBe(at(0.9))
    expect(f.projection).toHaveLength(1)
    expect(f.lockedMs).toBe(reset - at(0.9))
  })

  it('never runs out at zero pace, or when now is the window start', () => {
    for (const f of [
      runwayForecast({ used: 0.3, windowStart: start, resetAt: reset, now: at(0.5), pace: 0 }),
      runwayForecast({ used: 0, windowStart: start, resetAt: reset, now: start }),
    ]) {
      expect(f.runsOutAt).toBeUndefined()
      expect(f.paceRatio).toBe(0)
      expect(f.usedAtReset).toBe(f.projection[0]?.used)
    }
  })

  it('has nothing ahead once the window is over, even if it was used up', () => {
    const f = runwayForecast({ used: 1.2, windowStart: start, resetAt: reset, now: reset + H })
    expect(f.runsOutAt).toBeUndefined()
    expect(f.projection).toHaveLength(1)
    expect(f.usedAtReset).toBe(1.2)
    expect(f.lockedMs).toBe(0)
  })

  it('warns once and returns no projection for bad input, without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad = [
      { used: Number.NaN, windowStart: start, resetAt: reset, now: at(0.5) },
      { used: -0.1, windowStart: start, resetAt: reset, now: at(0.5) },
      { used: 0.1, windowStart: 'nope', resetAt: reset, now: at(0.5) },
      { used: 0.1, windowStart: reset, resetAt: start, now: at(0.5) },
      { used: 0.1, windowStart: start, resetAt: reset, now: at(0.5), pace: -1 },
    ]
    for (const input of bad) {
      const f = runwayForecast(input)
      expect(f.projection).toEqual([])
      expect(f.runsOutAt).toBeUndefined()
      expect(f.usedAtReset).toBeNaN()
      expect(f.lockedMs).toBe(0)
    }
    expect(
      warn.mock.calls.filter(([m]) => String(m).includes('runwayForecast needs')),
    ).toHaveLength(1)
  })
})

describe('parseCell', () => {
  it('reads minutes, hours, days and milliseconds, defaulting to 6 h', () => {
    expect(parseCell(undefined)).toBe(6 * H)
    expect(parseCell('30m')).toBe(30 * 6e4)
    expect(parseCell('6h')).toBe(6 * H)
    expect(parseCell('1.5d')).toBe(1.5 * D)
    expect(parseCell(42)).toBe(42)
  })
  it('rejects anything else', () => {
    for (const bad of ['6', 'h', '0h', '-1d', '6 h', 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(parseCell(bad as string | number)).toBeUndefined()
    }
  })
})

describe('cellBounds', () => {
  it('cuts the last cell at the domain end', () => {
    expect(cellBounds([0, 10], 4)).toEqual({
      bounds: [
        [0, 4],
        [4, 8],
        [8, 10],
      ],
      cut: false,
    })
  })
  it('keeps at most 200 cells', () => {
    const { bounds, cut } = cellBounds([0, 1000], 1)
    expect(bounds).toHaveLength(200)
    expect(cut).toBe(true)
  })
})

describe('projectionAt', () => {
  const pts = [
    { at: 10, used: 0.2 },
    { at: 20, used: 0.6 },
  ]
  it('interpolates and holds the ends', () => {
    expect(projectionAt(pts, 15)).toBeCloseTo(0.4, 9)
    expect(projectionAt(pts, 0)).toBe(0.2)
    expect(projectionAt(pts, 99)).toBe(0.6)
    expect(projectionAt([], 5)).toBeNaN()
  })
})

describe('normalizeRow', () => {
  it('parses dates, sorts points and warns', () => {
    const warn = vi.fn()
    const t = normalizeRow(
      {
        id: 'a',
        projection: [
          { at: 20, used: 0.5 },
          { at: '1970-01-01T00:00:00.010Z', used: 0.1 },
          { at: 'bad', used: 0.3 },
          { at: 30, used: -1 },
        ],
        runsOutAt: 'nope',
        resetAt: 40,
      },
      warn,
    )
    expect(t.points).toEqual([
      { at: 10, used: 0.1 },
      { at: 20, used: 0.5 },
    ])
    expect(t.runsOutAt).toBeUndefined()
    expect(t.resetAt).toBe(40)
    expect(t.forecast).toBe(true)
    expect([...new Set(warn.mock.calls.map(([key]) => key))].sort()).toEqual([
      'runway-dates',
      'runway-projection',
      'runway-projection-order',
    ])
  })
  it('drops a runsOutAt after resetAt', () => {
    const warn = vi.fn()
    const t = normalizeRow(
      { id: 'a', projection: [{ at: 0, used: 0 }], runsOutAt: 50, resetAt: 40 },
      warn,
    )
    expect(t.runsOutAt).toBeUndefined()
    expect(warn).toHaveBeenCalledWith('runway-runs-out', expect.stringContaining('"a"'))
  })
  it('has no forecast when disconnected or without points', () => {
    expect(
      normalizeRow({ id: 'a', projection: [{ at: 0, used: 0 }], disconnected: true }, vi.fn())
        .forecast,
    ).toBe(false)
    expect(normalizeRow({ id: 'a' }, vi.fn()).forecast).toBe(false)
  })
})

describe('runwayCells', () => {
  const edges = [0.25, 0.5, 0.75]
  const levels = binLevels(4) // [1, 2, 4, 5]
  const bounds = cellBounds([0, 100], 10).bounds
  const states = (cells: { state: string; level: number }[]) =>
    cells.map((c) => (c.state === 'level' ? `L${c.level}` : c.state))

  it('levels, runs out, locks until reset, then empties', () => {
    const times = {
      points: [
        { at: 0, used: 0 },
        { at: 40, used: 1 },
      ],
      runsOutAt: 40,
      resetAt: 70,
      forecast: true,
    }
    expect(states(runwayCells(times, bounds, edges, levels))).toEqual([
      'L1',
      'L2',
      'L4',
      'L5',
      'runs-out',
      'locked',
      'locked',
      'empty',
      'empty',
      'empty',
    ])
  })

  it('puts a runsOutAt on a cell start into that cell', () => {
    const times = { points: [{ at: 0, used: 0.9 }], runsOutAt: 30, resetAt: 100, forecast: true }
    expect(runwayCells(times, bounds, edges, levels)[3]?.state).toBe('runs-out')
    expect(runwayCells(times, bounds, edges, levels)[2]?.state).toBe('level')
  })

  it('is all empty without a forecast', () => {
    const times = { points: [], forecast: false }
    expect(new Set(states(runwayCells(times, bounds, edges, levels)))).toEqual(new Set(['empty']))
  })

  it('row entirely outside the domain: reset before it empties all, a later forecast holds its first value', () => {
    const before = { points: [{ at: -50, used: 0.3 }], resetAt: -10, forecast: true }
    expect(new Set(states(runwayCells(before, bounds, edges, levels)))).toEqual(new Set(['empty']))
    const after = { points: [{ at: 500, used: 0.6 }], forecast: true }
    expect(new Set(states(runwayCells(after, bounds, edges, levels)))).toEqual(new Set(['L4']))
  })
})

describe('status text', () => {
  const f = {
    weekday: createDateFormatter({ weekday: 'short' }),
    day: createDateFormatter({ month: 'short', day: 'numeric' }),
    time: createDateFormatter({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
  }
  const now = Date.UTC(2026, 9, 15, 2) // Thu Oct 15 02:00 UTC
  const end = now + 7 * D

  it('writes a weekday within 6 days, the date later in the domain, and the day past it', () => {
    expect(runwayDate(Date.UTC(2026, 9, 16, 3, 24), now, end, f)).toEqual({
      text: 'Fri 03:24',
      beyond: false,
    })
    expect(runwayDate(Date.UTC(2026, 9, 21, 9, 21), now, end, f)).toEqual({
      text: 'Oct 21 09:21',
      beyond: false,
    })
    expect(runwayDate(Date.UTC(2026, 10, 9, 8), now, end, f)).toEqual({
      text: 'Nov 9',
      beyond: true,
    })
    expect(runwayDate(end, now, end, f).beyond).toBe(false)
  })

  it('covers the four cases', () => {
    const base = {
      usedAtReset: Number.NaN,
      runsOutBeyond: false,
      resetBeyond: false,
      forecast: true,
    }
    const reset = new Date(Date.UTC(2026, 9, 16, 11, 22))
    expect(
      statusLines(
        {
          ...base,
          runsOutAt: new Date(Date.UTC(2026, 9, 16, 3, 24)),
          resetAt: reset,
          usedAtReset: 1.05,
        },
        false,
        now,
        end,
        f,
      ),
    ).toEqual(['Runs out Fri 03:24', 'Resets Fri 11:22'])
    expect(
      statusLines({ ...base, resetAt: reset, usedAtReset: 0.534 }, false, now, end, f),
    ).toEqual(['~53% at reset', 'Resets Fri 11:22'])
    expect(
      statusLines(
        { ...base, resetAt: new Date(Date.UTC(2026, 10, 9)), resetBeyond: true, usedAtReset: 0.6 },
        false,
        now,
        end,
        f,
      ),
    ).toEqual(['~60% at reset', 'Resets Nov 9 →'])
    expect(statusLines({ ...base, forecast: false, resetAt: reset }, false, now, end, f)).toEqual([
      'No forecast',
      'Resets Fri 11:22',
    ])
    expect(statusLines({ ...base, forecast: false }, true, now, end, f)).toEqual(['Disconnected'])
  })

  it('derives the facts, reading the projection at reset', () => {
    const facts = runwayFacts(
      {
        points: [
          { at: now, used: 0.2 },
          { at: now + 2 * D, used: 0.6 },
        ],
        resetAt: now + 2 * D,
        forecast: true,
      },
      end,
    )
    expect(facts.usedAtReset).toBeCloseTo(0.6, 9)
    expect(facts.resetBeyond).toBe(false)
    expect(runwayFacts({ points: [], forecast: false }, end).usedAtReset).toBeNaN()
  })
})
