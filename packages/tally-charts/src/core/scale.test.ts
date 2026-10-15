import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import type { LinearScale } from './linear'
import {
  type BandScale,
  categoryCenter,
  categoryStep,
  createScale,
  inferLinearDomain,
  type PointScale,
} from './scale'

const noop = () => {}

describe('inferLinearDomain', () => {
  it('includes zero by default', () => {
    expect(inferLinearDomain([12, 30])).toEqual([0, 30])
  })

  it('anchors all-negative data at zero', () => {
    expect(inferLinearDomain([-5, -2])).toEqual([-5, 0])
  })

  it('returns [0, 1] for empty or all-zero data', () => {
    expect(inferLinearDomain([])).toEqual([0, 1])
    expect(inferLinearDomain([0, 0])).toEqual([0, 1])
  })

  it('pads a flat domain when zero is off', () => {
    expect(inferLinearDomain([10, 10], false)).toEqual([9, 11])
  })

  it('ignores non-finite values', () => {
    expect(inferLinearDomain([Number.NaN, 4])).toEqual([0, 4])
  })
})

describe('createScale', () => {
  const rows = [
    { week: 'Jul 6', margin: 36 },
    { week: 'Jul 13', margin: 33 },
  ]

  it('builds a band scale from the field in data order', () => {
    const s = createScale({ type: 'band', field: 'week', padding: 0 }, rows, 'x', 200, noop)
    if (s.kind !== 'band') throw new Error('expected a band scale')
    expect(s.scale.domain()).toEqual(['Jul 6', 'Jul 13'])
    expect(s.scale.bandwidth()).toBe(100)
  })

  it('builds an inverted y scale with a niced inferred domain', () => {
    const s = createScale({ field: 'margin' }, rows, 'y', 100, noop)
    if (s.kind !== 'linear') throw new Error('expected a linear scale')
    expect(s.scale.domain()).toEqual([0, 40])
    expect(s.scale(0)).toBe(100)
    expect(s.scale(40)).toBe(0)
  })

  it('keeps an explicit domain as given', () => {
    const s = createScale({ domain: [26, 39] }, rows, 'x', 130, noop)
    if (s.kind !== 'linear') throw new Error('expected a linear scale')
    expect(s.scale.domain()).toEqual([26, 39])
    expect(s.scale(26)).toBe(0)
  })

  it('exposes the field getter', () => {
    const s = createScale({ field: 'margin' }, rows, 'y', 100, noop)
    expect(s.field?.(rows[0], 0)).toBe(36)
  })

  it('warns when a domain cannot be inferred', () => {
    const warn = vi.fn()
    createScale({ type: 'band' }, rows, 'x', 100, warn)
    createScale(undefined, rows, 'y', 100, warn)
    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls[0]?.[1]).toContain('<Chart x>')
    expect(warn.mock.calls[1]?.[1]).toContain('<Chart y>')
  })

  it('tolerates null rows and non-finite values', () => {
    const bad = [{ margin: 10 }, null, { margin: Number.NaN }, { margin: 30 }] as unknown as {
      margin: number
    }[]
    const s = createScale({ field: 'margin' }, bad, 'y', 100, noop)
    if (s.kind !== 'linear') throw new Error('expected a linear scale')
    expect(s.scale.domain()).toEqual([0, 30])
    const b = createScale({ type: 'band', field: 'margin' }, bad, 'x', 100, noop)
    if (b.kind !== 'band') throw new Error('expected a band scale')
    expect(b.scale.domain()).toEqual(['10', 'NaN', '30'])
  })

  it('leaves blank and boolean values out of an inferred domain', () => {
    const rows = [{ v: '' }, { v: false }, { v: 5 }, { v: 10 }]
    const scale = createScale<{ v: unknown }>(
      { field: 'v', zero: false, nice: false },
      rows,
      'y',
      100,
      () => {},
    )
    expect(scale.kind === 'linear' && scale.scale.domain()).toEqual([5, 10])
  })
})

describe('point scales', () => {
  const months = [{ m: 'Apr' }, { m: 'May' }, { m: 'Jun' }]

  it('spaces points evenly with half a step at each end', () => {
    const s = createScale({ type: 'point', field: 'm' }, months, 'x', 300, noop)
    if (s.kind !== 'point') throw new Error('expected a point scale')
    expect(s.scale.domain()).toEqual(['Apr', 'May', 'Jun'])
    expect(['Apr', 'May', 'Jun'].map((m) => s.scale(m))).toEqual([50, 150, 250])
    expect(s.scale.step()).toBe(100)
  })

  it('centres a single point', () => {
    const s = createScale({ type: 'point', domain: ['Apr'] }, [], 'x', 300, noop)
    if (s.kind !== 'point') throw new Error('expected a point scale')
    expect(s.scale('Apr')).toBe(150)
  })

  it('takes an explicit domain and padding', () => {
    const s = createScale({ type: 'point', domain: ['a', 'b'], padding: 0 }, [], 'x', 100, noop)
    if (s.kind !== 'point') throw new Error('expected a point scale')
    expect([s.scale('a'), s.scale('b')]).toEqual([0, 100])
  })

  it('warns when it has no domain', () => {
    const warn = vi.fn()
    createScale({ type: 'point' }, months, 'x', 100, warn)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toBe('x-point-domain')
    expect(warn.mock.calls[0]?.[1]).toContain('<Chart x>')
  })
})

describe('categoryCenter and categoryStep', () => {
  const band = createScale({ type: 'band', domain: ['a', 'b'], padding: 0 }, [], 'x', 200, noop)
  const point = createScale({ type: 'point', domain: ['a', 'b'] }, [], 'x', 200, noop)
  const linear = createScale({ domain: [0, 1] }, [], 'x', 100, noop)

  it('finds band centres and point positions', () => {
    expect(categoryCenter(band, 'b')).toBe(150)
    expect(categoryStep(band)).toBe(100)
    expect(categoryCenter(point, 'a')).toBe(50)
    expect(categoryCenter(point, 'b')).toBe(150)
    expect(categoryStep(point)).toBe(100)
  })

  it('matches numbers to their string categories', () => {
    const years = createScale({ type: 'point', domain: [2024, 2025] }, [], 'x', 200, noop)
    expect(categoryCenter(years, 2025)).toBe(150)
  })

  it('gives undefined for unknown values and linear scales', () => {
    expect(categoryCenter(point, 'z')).toBeUndefined()
    expect(categoryCenter(point, null)).toBeUndefined()
    expect(categoryCenter(point, undefined)).toBeUndefined()
    expect(categoryCenter(linear, 0)).toBeUndefined()
    expect(categoryStep(linear)).toBe(0)
  })
})

describe('resolved scale types', () => {
  it("narrows to the library's own scale interfaces", () => {
    const s = createScale({ type: 'band', domain: ['a', 'b'] }, [], 'x', 200, noop)
    if (s.kind === 'band') expectTypeOf(s.scale).toEqualTypeOf<BandScale>()
    if (s.kind === 'point') expectTypeOf(s.scale).toEqualTypeOf<PointScale>()
    if (s.kind === 'linear') expectTypeOf(s.scale).toEqualTypeOf<LinearScale>()
    expect(s.kind).toBe('band')
  })
})
