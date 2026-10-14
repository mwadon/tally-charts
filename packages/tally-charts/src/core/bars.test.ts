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

  it('clamps values outside an explicit domain into the plot', () => {
    const { bars } = layout(
      [
        { k: 'a', v: 24 },
        { k: 'b', v: 42 },
        { k: 'c', v: 30 },
      ],
      [26, 40],
    )
    for (const bar of bars) {
      expect(Number.isFinite(bar.y + bar.height)).toBe(true)
      expect(bar.y).toBeGreaterThanOrEqual(0)
      expect(bar.y + bar.height).toBeLessThanOrEqual(100)
      expect(bar.anchor.y).toBeGreaterThanOrEqual(0)
      expect(bar.anchor.y).toBeLessThanOrEqual(100)
    }
    // 24 clamps onto the baseline (26): zero-length, not drawn through the axis.
    expect(bars[0]).toMatchObject({ y: 100, height: 0, dir: 'up' })
    // 42 clamps to the top of the plot.
    expect(bars[1]).toMatchObject({ y: 0, height: 100, dir: 'up' })
  })

  it('clamps horizontal bars outside the domain', () => {
    const { bars } = layout([{ k: 'a', v: 42 }], [26, 40], true)
    expect(bars[0]).toMatchObject({ x: 0, width: 100, dir: 'right' })
  })

  it('draws a value below a mid-domain baseline on the downward side', () => {
    const { bars } = layout([{ k: 'a', v: -20 }], [-10, 10])
    expect(bars[0]).toMatchObject({ y: 50, height: 50, dir: 'down' })
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

describe('computeBars options', () => {
  type Span = { k: string; v: number | null; f?: number | null }
  const getSpanK = (d: unknown) => (d as Span).k
  const getSpanV = (d: unknown) => (d as Span).v
  const getSpanF = (d: unknown) => (d as Span).f

  function spans(
    rows: Span[],
    options: Partial<Parameters<typeof computeBars>[0]> = {},
    horizontal = false,
  ) {
    const band = createScale<Span>(
      { type: 'band', field: 'k', padding: 0 },
      rows,
      horizontal ? 'y' : 'x',
      200,
      noop,
    )
    const linear = createScale<Span>({ domain: [0, 20] }, rows, horizontal ? 'x' : 'y', 100, noop)
    return computeBars({
      data: rows,
      ids: rows.map((_, i) => i),
      x: horizontal ? linear : band,
      y: horizontal ? band : linear,
      getX: horizontal ? getSpanV : getSpanK,
      getY: horizontal ? getSpanK : getSpanV,
      warn: noop,
      ...options,
    }).bars
  }

  const two: Span[] = [
    { k: 'a', v: 15, f: 10 },
    { k: 'b', v: 5, f: 10 },
  ]

  it('runs bars from a start value instead of the baseline', () => {
    const [up, down] = spans(two, { getFrom: getSpanF })
    // y range is [100, 0]: 10 → 50, 15 → 25, 5 → 75.
    expect(up).toMatchObject({ y: 25, height: 25, dir: 'up', anchor: { y: 25 } })
    expect(down).toMatchObject({ y: 50, height: 25, dir: 'down', anchor: { y: 75 } })
  })

  it('falls back to the baseline when the start value is missing', () => {
    const [bar] = spans([{ k: 'a', v: 10, f: null }], { getFrom: getSpanF })
    expect(bar).toMatchObject({ y: 50, height: 50, dir: 'up' })
  })

  it('sizes, aligns and offsets a bar inside its band', () => {
    expect(spans(two, { size: 20 })[0]).toMatchObject({ x: 40, width: 20 })
    expect(spans(two, { size: 20, align: 'start' })[0]).toMatchObject({ x: 0 })
    expect(spans(two, { size: 20, align: 'end' })[0]).toMatchObject({ x: 80 })
    expect(spans(two, { size: 20, offset: 5 })[0]).toMatchObject({ x: 45, anchor: { x: 55 } })
  })

  it('never makes a bar thicker than its band and ignores a non-finite size', () => {
    expect(spans(two, { size: 500 })[0]).toMatchObject({ x: 0, width: 100 })
    expect(spans(two, { size: Number.NaN })[0]).toMatchObject({ x: 0, width: 100 })
  })

  it('reports the whole band for hit areas', () => {
    expect(spans(two, { size: 20 })[1]?.band).toEqual({ start: 100, size: 100 })
  })

  it('applies the options to horizontal bars', () => {
    const [bar] = spans([{ k: 'a', v: 10, f: 5 }], { getFrom: getSpanF, size: 10 }, true)
    // x range is [0, 100]: 5 → 25, 10 → 50; band 'a' is [0, 200) on y.
    expect(bar).toMatchObject({ x: 25, width: 25, y: 95, height: 10, dir: 'right' })
    expect(bar?.band).toEqual({ start: 0, size: 200 })
  })
})
