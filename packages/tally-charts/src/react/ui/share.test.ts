import { afterEach, describe, expect, it, vi } from 'vitest'
import { SHARE_TONES, shareLayout } from './share'

afterEach(() => vi.restoreAllMocks())

describe('shareLayout', () => {
  it('keeps order, shares and default tones by position, never loss', () => {
    const { parts, total } = shareLayout([
      { label: 'a', value: 2 },
      { label: 'b', value: 1, tone: 'loss' },
      { label: 'c', value: 1 },
    ])
    expect(total).toBe(4)
    expect(parts.map((p) => p.label)).toEqual(['a', 'b', 'c'])
    expect(parts.map((p) => p.share)).toEqual([50, 25, 25])
    expect(parts.map((p) => p.tone)).toEqual(['accent', 'loss', 'warn'])
    expect(parts.map((p) => p.fill)).toEqual(['solid', 'solid', 'solid'])
    expect(parts.map((p) => p.key)).toEqual([0, 1, 2])
    expect(SHARE_TONES).not.toContain('loss')
    const six = shareLayout(Array.from({ length: 6 }, (_, i) => ({ label: `${i}`, value: 1 })))
    expect(six.parts[5]?.tone).toBe('accent')
  })

  it('rounds percentages with the largest remainder so they add up to 100', () => {
    const { parts } = shareLayout([
      { label: 'Internal links', value: 2711 },
      { label: 'Search', value: 1968 },
      { label: 'Direct', value: 1101 },
      { label: 'Social', value: 43 },
      { label: 'External', value: 26 },
    ])
    expect(parts.map((p) => p.percent)).toEqual([46, 34, 19, 1, 0])
    expect(parts.reduce((s, p) => s + p.percent, 0)).toBe(100)
    expect(parts.map((p) => p.percentText)).toEqual(['46%', '34%', '19%', '1%', '<1%'])
  })

  it('leaves the rest of a larger total unassigned', () => {
    const { parts, total } = shareLayout([{ label: 'Reviewed', value: 62 }], 800)
    expect(total).toBe(800)
    expect(parts[0]?.share).toBeCloseTo(7.75)
    expect(parts[0]?.percent).toBe(8)
  })

  it('survives all zeros without NaN', () => {
    const { parts, total } = shareLayout([
      { label: 'a', value: 0 },
      { label: 'b', value: 0 },
    ])
    expect(total).toBe(0)
    expect(parts.map((p) => [p.share, p.percent, p.percentText])).toEqual([
      [0, 0, '0%'],
      [0, 0, '0%'],
    ])
  })

  it('counts bad values as 0, uses the sum over a smaller total, and warns once per case', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { parts, total } = shareLayout(
      [
        { label: 'a', value: -3 },
        { label: 'b', value: Number.NaN },
        { label: 'c', value: 5 },
      ],
      2,
    )
    expect(parts.map((p) => p.value)).toEqual([0, 0, 5])
    expect(total).toBe(5)
    shareLayout(Array.from({ length: 7 }, (_, i) => ({ label: `${i}`, value: 1 })))
    const messages = warn.mock.calls.map((c) => String(c[0]))
    expect(messages).toEqual([
      expect.stringContaining('ShareBar segment "a" has a value that is negative or not a number'),
      expect.stringContaining('ShareBar segment "b" has a value of NaN, which is not finite'),
      expect.stringContaining('ShareBar total 2 is smaller than the sum of its segments (5)'),
      expect.stringContaining('ShareBar has 7 segments'),
    ])
  })

  it.each([Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN])(
    'treats %s as no data, counts it as 0 and warns once',
    (v) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { parts, empty } = shareLayout([{ label: `v${v}`, value: v }])
      expect(empty).toBe(true)
      expect(parts[0]?.value).toBe(0)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(String(warn.mock.calls[0]?.[0])).toContain('not finite')
    },
  )

  it('is empty only when no segment has a valid value', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(
      shareLayout([
        { label: 'e1', value: 5 },
        { label: 'e2', value: Infinity },
      ]).empty,
    ).toBe(false)
    expect(shareLayout([{ label: 'e3', value: 0 }]).empty).toBe(false)
    expect(
      shareLayout([
        { label: 'e4', value: -1 },
        { label: 'e5', value: Infinity },
      ]).empty,
    ).toBe(true)
    expect(shareLayout([]).empty).toBe(false)
  })

  it('warns when the total is not a finite number and uses the sum', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { total } = shareLayout([{ label: 'a', value: 3 }], Number.POSITIVE_INFINITY)
    expect(total).toBe(3)
    expect(String(warn.mock.calls[0]?.[0])).toContain(
      'ShareBar total Infinity is not a finite number; the sum is used.',
    )
  })

  it('passes `color` on to the part, and leaves it out otherwise', () => {
    const { parts } = shareLayout([
      { label: 'A', value: 1, color: '#fc0' },
      { label: 'B', value: 1 },
    ])
    expect(parts[0]?.color).toBe('#fc0')
    expect(parts[1]).not.toHaveProperty('color')
  })
})
