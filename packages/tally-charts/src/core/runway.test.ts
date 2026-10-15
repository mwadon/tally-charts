import { afterEach, describe, expect, it, vi } from 'vitest'
import { runwayForecast } from './runway'

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
