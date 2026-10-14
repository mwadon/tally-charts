import { describe, expect, it } from 'vitest'
import { runningTotals } from './steps'

describe('runningTotals', () => {
  it('carries the total from step to step', () => {
    const totals = runningTotals(1260, [-260, -260, -240, -100])
    expect(totals.map((t) => [t.before, t.after])).toEqual([
      [1260, 1000],
      [1000, 740],
      [740, 500],
      [500, 400],
    ])
    expect(totals.every((t) => t.valid && t.tone === 'loss')).toBe(true)
    expect(totals[2]).toMatchObject({ index: 2, value: -240 })
  })

  it('tones rises as gains and zero as neutral', () => {
    expect(runningTotals(10, [5, 0, -1]).map((t) => t.tone)).toEqual(['gain', 'neutral', 'loss'])
  })

  it('skips missing or non-numeric values without changing the total', () => {
    const totals = runningTotals(10, [5, null, 'x', undefined, -3])
    expect(totals.map((t) => t.after)).toEqual([15, 15, 15, 15, 12])
    expect(totals.map((t) => t.valid)).toEqual([true, false, false, false, true])
    expect(totals[1]?.tone).toBe('neutral')
    expect(Number.isNaN(totals[1]?.value)).toBe(true)
  })

  it('treats blank, boolean, object and symbol values as missing without throwing', () => {
    const values: unknown[] = [
      '',
      '  ',
      true,
      false,
      [],
      [5],
      Symbol('x'),
      Object.create(null),
      '7',
    ]
    let totals: ReturnType<typeof runningTotals> = []
    expect(() => {
      totals = runningTotals(0, values)
    }).not.toThrow()
    expect(totals.map((t) => t.valid)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
    ])
    expect(totals[totals.length - 1]?.after).toBe(7)
  })

  it('counts a non-finite start as zero and handles no steps', () => {
    expect(runningTotals(Number.NaN, [4])[0]).toMatchObject({ before: 0, after: 4 })
    expect(runningTotals(10, [])).toEqual([])
  })
})
