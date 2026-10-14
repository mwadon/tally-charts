import { describe, expect, it, vi } from 'vitest'
import { computeBars } from './bars'
import { createScale } from './scale'

type Row = { k: string; v: number | null }
const noop = () => {}
const getK = (d: unknown) => (d as Row).k
const getV = (d: unknown) => (d as Row).v

function layout(rows: Row[], domain: [number, number], horizontal = false) {
  const band = createScale<Row>(
    { type: 'band', field: 'k', padding: 0 },
    rows,
    horizontal ? 'y' : 'x',
    200,
    noop,
  )
  const linear = createScale<Row>({ domain }, rows, horizontal ? 'x' : 'y', 100, noop)
  return computeBars({
    data: rows,
    ids: rows.map((_, i) => i),
    x: horizontal ? linear : band,
    y: horizontal ? band : linear,
    getX: horizontal ? getV : getK,
    getY: horizontal ? getK : getV,
    warn: noop,
  })
}

describe('computeBars', () => {
  it('lays out vertical bars from the zero baseline', () => {
    const { orientation, bars } = layout(
      [
        { k: 'a', v: 10 },
        { k: 'b', v: 20 },
      ],
      [0, 20],
    )
    expect(orientation).toBe('vertical')
    expect(bars[0]).toMatchObject({
      x: 0,
      y: 50,
      width: 100,
      height: 50,
      dir: 'up',
      anchor: { x: 50, y: 50 },
    })
    expect(bars[1]).toMatchObject({ x: 100, y: 0, height: 100 })
  })

  it('draws negative values downward from zero', () => {
    const { bars } = layout([{ k: 'a', v: -10 }], [-10, 10])
    expect(bars[0]).toMatchObject({ y: 50, height: 50, dir: 'down', anchor: { y: 100 } })
  })

  it('clamps the baseline into a domain that excludes zero', () => {
    const { bars } = layout([{ k: 'a', v: 30 }], [20, 40])
    expect(bars[0]).toMatchObject({ y: 50, height: 50 })
  })

  it('lays out horizontal bars when y is the band scale', () => {
    const { orientation, bars } = layout(
      [
        { k: 'a', v: 10 },
        { k: 'b', v: 5 },
      ],
      [0, 20],
      true,
    )
    expect(orientation).toBe('horizontal')
    expect(bars[0]).toMatchObject({
      x: 0,
      y: 0,
      width: 50,
      height: 100,
      dir: 'right',
      anchor: { x: 50, y: 50 },
    })
  })

  it('skips missing values and warns', () => {
    const warn = vi.fn()
    const rows: Row[] = [
      { k: 'a', v: null },
      { k: 'b', v: 4 },
    ]
    const band = createScale<Row>({ type: 'band', field: 'k' }, rows, 'x', 200, noop)
    const linear = createScale<Row>({ domain: [0, 4] }, rows, 'y', 100, noop)
    const { bars } = computeBars({
      data: rows,
      ids: [0, 1],
      x: band,
      y: linear,
      getX: getK,
      getY: getV,
      warn,
      valueField: 'margin',
    })
    expect(bars.map((b) => b.category)).toEqual(['b'])
    expect(warn).toHaveBeenCalledWith(
      'bars-value',
      'Bars skipped a missing or non-numeric value for field "margin" at index 0.',
    )
  })

  it('warns and draws nothing without one band and one linear scale', () => {
    const warn = vi.fn()
    const rows: Row[] = [{ k: 'a', v: 1 }]
    const linear = createScale<Row>({ domain: [0, 1] }, rows, 'x', 100, noop)
    expect(
      computeBars({ data: rows, ids: [0], x: linear, y: linear, getX: getV, getY: getV, warn })
        .bars,
    ).toEqual([])
    expect(warn).toHaveBeenCalledWith('bars-scales', expect.any(String))
  })
})
