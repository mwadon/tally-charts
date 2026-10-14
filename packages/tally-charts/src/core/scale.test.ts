import { describe, expect, it, vi } from 'vitest'
import { createScale, inferLinearDomain } from './scale'

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
