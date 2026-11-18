import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ChartPoint } from '../types'
import type { BarSeries } from './bar-series'
import { StackedBarChart, type StackedBarChartProps } from './StackedBarChart'

// Records every points array a mark registers, so a test can see whether a re-render with the
// same props registers a new array. The real hook still runs.
const registered = vi.hoisted(() => [] as (readonly ChartPoint[])[])
vi.mock('../useRegisterPoints', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../useRegisterPoints')>()
  return {
    useRegisterPoints: (points: readonly ChartPoint[]) => {
      if (points.length > 0) registered.push(points)
      actual.useRegisterPoints(points)
    },
  }
})

type Month = {
  month: string
  labor: number | null
  materials: number | null
  subcontract: number | null
  forecast?: boolean
}
// Totals 51/56/58/66/56/69.
const months: Month[] = [
  { month: 'Jan', labor: 24, materials: 18, subcontract: 9 },
  { month: 'Feb', labor: 26, materials: 20, subcontract: 10 },
  { month: 'Mar', labor: 27, materials: 20, subcontract: 11 },
  { month: 'Apr', labor: 28, materials: 21, subcontract: 17 },
  { month: 'May', labor: 27, materials: 19, subcontract: 10 },
  { month: 'Jun', labor: 29, materials: 20, subcontract: 20, forecast: true },
]
const three: BarSeries<Month>[] = [
  { id: 'labor', label: 'Labor', value: 'labor' },
  { id: 'materials', label: 'Materials', value: 'materials' },
  { id: 'subcontract', label: 'Subcontract', value: 'subcontract' },
]

// A fixed plot: height 240 with margins 24 + 28 leaves 188 px for the domain [0, 80].
const HEIGHT = 240
const PLOT = 188
const DOMAIN = [0, 80] as const
const yOf = (v: number) => PLOT - (v * PLOT) / DOMAIN[1]

function renderChart(props: Partial<StackedBarChartProps<Month>> = {}) {
  return render(
    <StackedBarChart<Month>
      data={months}
      x="month"
      series={three}
      width={300}
      height={HEIGHT}
      domain={DOMAIN}
      title="Monthly cost against budget"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, part: string) => [
  ...root.querySelectorAll<SVGElement>(`[data-ch-part="${part}"]`),
]
const num = (el: Element, attr: string) => Number(el.getAttribute(attr))
const bars = (root: HTMLElement) => parts(root, 'bar')
const tone = (el: Element) => el.getAttribute('data-ch-tone')
const bottom = (el: Element) => num(el, 'y') + num(el, 'height')
/** The rects of category column `row` (vertical), bottom-up. */
function column(root: HTMLElement, row: number) {
  const all = bars(root)
  const xs = [...new Set(all.map((b) => num(b, 'x')))].sort((a, b) => a - b)
  return all.filter((b) => num(b, 'x') === xs[row]).sort((a, b) => num(b, 'y') - num(a, 'y'))
}
/** The rects of category row `row` (horizontal), left to right. */
function row(root: HTMLElement, index: number) {
  const all = bars(root)
  const ys = [...new Set(all.map((b) => num(b, 'y')))].sort((a, b) => a - b)
  return all.filter((b) => num(b, 'y') === ys[index]).sort((a, b) => num(a, 'x') - num(b, 'x'))
}
/** The numeric axis labels: the value axis (the category axis reads Jan–Jun). */
const valueTicks = (root: HTMLElement) =>
  parts(root, 'axis-label')
    .map((t) => Number(t.textContent))
    .filter(Number.isFinite)
const quiet = () => vi.spyOn(console, 'warn').mockImplementation(() => {})

describe('<StackedBarChart>', () => {
  it('stacks one rect per series bottom-up with a 2 px gap and an exact total', () => {
    const { container } = renderChart()
    expect(bars(container)).toHaveLength(18)
    const [labor, materials, subcontract] = column(container, 0) as [
      SVGElement,
      SVGElement,
      SVGElement,
    ]
    expect(num(labor, 'x')).toBeCloseTo(num(materials, 'x'))
    expect(num(labor, 'width')).toBeCloseTo(num(subcontract, 'width'))
    expect(bottom(labor)).toBeCloseTo(yOf(0))
    expect(num(labor, 'y') - bottom(materials)).toBeCloseTo(2)
    expect(num(materials, 'y') - bottom(subcontract)).toBeCloseTo(2)
    // Series order from the baseline: labor 0→24 (less the gap), materials from 24.
    expect(num(labor, 'y')).toBeCloseTo(yOf(24) + 2)
    expect(bottom(materials)).toBeCloseTo(yOf(24))
    // The outermost piece gives up nothing.
    expect(num(subcontract, 'y')).toBeCloseTo(yOf(51))
  })

  it('uses the default tone order, lets an explicit tone win, and repeats from the sixth', () => {
    const { container, unmount } = renderChart()
    expect(column(container, 0).map(tone)).toEqual(['accent', 'accent-soft', 'warn'])
    unmount()
    const explicit = renderChart({
      series: [three[0] as BarSeries<Month>, { ...(three[1] as BarSeries<Month>), tone: 'gain' }],
    })
    expect(column(explicit.container, 0).map(tone)).toEqual(['accent', 'gain'])
    explicit.unmount()
    const warn = quiet()
    const six = Array.from({ length: 6 }, (_, i) => ({
      id: `s${i}`,
      label: `S${i}`,
      value: () => 1,
    }))
    const many = renderChart({ series: six, domain: [0, 10] })
    expect(column(many.container, 0).map(tone)).toEqual([
      'accent',
      'accent-soft',
      'warn',
      'neutral',
      'gain',
      'accent',
    ])
    warn.mockRestore()
  })

  it('applies a series fill, and a row fill over every segment of that row', () => {
    const fillOf = (b: SVGElement) => b.getAttribute('data-ch-fill')
    const { container, unmount } = renderChart({
      series: [{ id: 'labor', label: 'Labor', value: 'labor', fill: 'hatch-fade' }],
    })
    expect(new Set(bars(container).map(fillOf))).toEqual(new Set(['hatch-fade']))
    unmount()
    const rowFill = renderChart({ fill: (d) => (d.forecast ? 'hatch' : undefined) })
    expect(column(rowFill.container, 5).map(fillOf)).toEqual(['hatch', 'hatch', 'hatch'])
    expect(
      new Set([0, 1, 2, 3, 4].flatMap((r) => column(rowFill.container, r).map(fillOf))),
    ).toEqual(new Set(['solid']))
  })

  it('paints the part of a stack above the target in the over tone, split at the target', () => {
    const { container, unmount } = renderChart({ target: { value: 60, over: 'loss' } })
    const loss = bars(container).filter((b) => tone(b) === 'loss')
    expect(loss).toHaveLength(2)
    // Apr: 28 + 21 + 17 = 66, subcontract crosses 60.
    const apr = column(container, 3)
    expect(apr).toHaveLength(4)
    const [, , sub, over] = apr as [SVGElement, SVGElement, SVGElement, SVGElement]
    expect(tone(over)).toBe('loss')
    expect(over.getAttribute('data-ch-fill')).toBe('solid')
    expect(bottom(over)).toBeCloseTo(yOf(60))
    expect(num(over, 'y')).toBeCloseTo(yOf(66))
    expect(tone(sub)).toBe('warn')
    expect(num(sub, 'y')).toBeCloseTo(yOf(60) + 2)
    expect(column(container, 5).map(tone)).toEqual(['accent', 'accent-soft', 'warn', 'loss'])
    for (const r of [0, 1, 2, 4]) {
      expect(column(container, r).map(tone)).toEqual(['accent', 'accent-soft', 'warn'])
    }
    unmount()
    for (const target of [60, { value: 60 }]) {
      const plain = renderChart({ target })
      expect(parts(plain.container, 'target')).toHaveLength(1)
      expect(bars(plain.container)).toHaveLength(18)
      expect(bars(plain.container).filter((b) => tone(b) === 'loss')).toHaveLength(0)
      plain.unmount()
    }
  })

  it('makes no zero-length piece and one gap when a boundary sits on the target', () => {
    const data = [{ month: 'Jan', labor: 24, materials: 21, subcontract: 9 }]
    const { container } = renderChart({ data, target: { value: 45, over: 'loss' } })
    const rects = column(container, 0)
    expect(rects.map(tone)).toEqual(['accent', 'accent-soft', 'loss'])
    for (const b of rects) expect(num(b, 'height')).toBeGreaterThan(0)
    const [, materials, over] = rects as [SVGElement, SVGElement, SVGElement]
    expect(bottom(over)).toBeCloseTo(yOf(45))
    expect(num(over, 'y')).toBeCloseTo(yOf(54))
    expect(num(materials, 'y')).toBeCloseTo(yOf(45) + 2)
  })

  it('closes up a missing or zero middle value, and warns about the missing one only', () => {
    const warn = quiet()
    const data = months.map((m) =>
      m.month === 'Feb'
        ? { ...m, materials: null }
        : m.month === 'Mar'
          ? { ...m, materials: 0 }
          : m,
    )
    const { container } = renderChart({ data })
    expect(bars(container)).toHaveLength(16)
    for (const r of [1, 2]) {
      const [labor, sub] = column(container, r) as [SVGElement, SVGElement]
      expect(column(container, r)).toHaveLength(2)
      expect(tone(sub)).toBe('warn')
      expect(num(labor, 'y') - bottom(sub)).toBeCloseTo(2)
    }
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('missing or non-numeric')
    warn.mockRestore()
  })

  it('stacks negatives down from zero and colours only the positive stack', () => {
    type Mixed = { k: string; a: number; b: number; c: number; d: number }
    const series: BarSeries<Mixed>[] = (['a', 'b', 'c', 'd'] as const).map((key) => ({
      id: key,
      label: key.toUpperCase(),
      value: key,
    }))
    const { container } = render(
      <StackedBarChart<Mixed>
        data={[{ k: 'A', a: 10, b: -4, c: 5, d: -6 }]}
        x="k"
        series={series}
        width={300}
        height={HEIGHT}
        domain={[-20, 20]}
        target={{ value: 12, over: 'loss' }}
        title="Mixed"
        animate={false}
      />,
    )
    const y = (v: number) => PLOT - ((v + 20) * PLOT) / 40
    const all = bars(container)
    const below = all.filter((b) => num(b, 'y') >= y(0) - 0.01)
    expect(below).toHaveLength(2)
    for (const b of below) expect(tone(b)).not.toBe('loss')
    const loss = all.filter((b) => tone(b) === 'loss')
    expect(loss).toHaveLength(1)
    expect(bottom(loss[0] as SVGElement)).toBeCloseTo(y(12))
    expect(num(loss[0] as SVGElement, 'y')).toBeCloseTo(y(15))
    // The negative stack reaches -10 exactly.
    expect(Math.max(...below.map(bottom))).toBeCloseTo(y(-10))
    const label = parts(container, 'value-label')[0] as SVGElement
    expect(label.textContent).toBe('5')
    expect(label.getAttribute('data-ch-tone')).toBe('loss')
    expect(num(label, 'y')).toBeCloseTo(y(15) - 6)
  })

  it('keeps every rect non-negative and a tiny segment at least 1 px', () => {
    const data = [{ month: 'Jan', labor: 50, materials: 0.01, subcontract: 50 }]
    const { container, unmount } = renderChart({ data, domain: undefined, height: 240 })
    const rects = bars(container)
    expect(rects).toHaveLength(3)
    for (const b of rects) {
      expect(num(b, 'width')).toBeGreaterThanOrEqual(0)
      expect(num(b, 'height')).toBeGreaterThanOrEqual(0)
    }
    expect(num(column(container, 0)[1] as SVGElement, 'height')).toBeGreaterThanOrEqual(1)
    unmount()
    const narrow = renderChart({ width: 60, target: { value: 60, over: 'loss' } })
    for (const b of bars(narrow.container)) {
      expect(num(b, 'width')).toBeGreaterThanOrEqual(0)
      expect(num(b, 'height')).toBeGreaterThanOrEqual(0)
    }
  })

  it('labels each stack with its total when the labels fit, and none otherwise', () => {
    const labels = (root: HTMLElement) => parts(root, 'value-label')
    const { container, unmount } = renderChart({ width: 584 })
    expect(labels(container).map((l) => l.textContent)).toEqual([
      '51',
      '56',
      '58',
      '66',
      '56',
      '69',
    ])
    const jan = column(container, 0)[2] as SVGElement
    const first = labels(container)[0] as SVGElement
    expect(num(first, 'y')).toBeCloseTo(yOf(51) - 6)
    expect(num(first, 'x')).toBeCloseTo(num(jan, 'x') + num(jan, 'width') / 2)
    expect(first.hasAttribute('data-ch-tone')).toBe(false)
    unmount()
    const narrow = renderChart({ width: 120 })
    expect(labels(narrow.container)).toHaveLength(0)
    narrow.unmount()
    const none = renderChart({ width: 584, valueLabel: 'none' })
    expect(labels(none.container)).toHaveLength(0)
    none.unmount()
    const formatted = renderChart({ width: 584, format: 'percent', valueFormat: 'hours' })
    expect(labels(formatted.container)[0]?.textContent).toContain('h')
    expect(labels(formatted.container)[0]?.textContent).not.toContain('%')
    formatted.unmount()
    const over = renderChart({ width: 584, target: { value: 60, over: 'loss' } })
    expect(labels(over.container).map((l) => l.getAttribute('data-ch-tone'))).toEqual([
      null,
      null,
      null,
      'loss',
      null,
      'loss',
    ])
  })

  it('lays out horizontally: segments of a row share y and run left to right', () => {
    const { container } = renderChart({ orientation: 'horizontal', height: undefined })
    const [a, b, c] = row(container, 0) as [SVGElement, SVGElement, SVGElement]
    expect(num(a, 'y')).toBeCloseTo(num(b, 'y'))
    expect(num(b, 'y')).toBeCloseTo(num(c, 'y'))
    expect(num(b, 'x') - (num(a, 'x') + num(a, 'width'))).toBeCloseTo(2)
    expect(num(c, 'x') - (num(b, 'x') + num(b, 'width'))).toBeCloseTo(2)
    // 6 rows × (20 + 20) + 8 + 28
    expect(container.querySelector('svg')?.getAttribute('height')).toBe('276')
    const lines = parts(container, 'grid-line')
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) expect(line.getAttribute('x1')).toBe(line.getAttribute('x2'))
    const label = parts(container, 'value-label')[0] as SVGElement
    expect(label.getAttribute('dominant-baseline')).toBe('middle')
    expect(num(label, 'x')).toBeCloseTo(num(c, 'x') + num(c, 'width') + 6)
  })

  it('fits the largest total and the target in the default domain, and uses an explicit one', () => {
    const { container, unmount } = renderChart({ domain: undefined, target: 75 })
    const ticks = valueTicks(container)
    expect(Math.max(...ticks)).toBeGreaterThanOrEqual(75)
    expect(parts(container, 'target')).toHaveLength(1)
    unmount()
    const total = renderChart({ domain: undefined })
    const max = Math.max(...valueTicks(total.container))
    // Stacked: the domain holds the largest total (69), not just the largest value (29).
    expect(max).toBeGreaterThanOrEqual(69)
    total.unmount()
    const explicit = renderChart({ domain: [0, 100] })
    const labels = parts(explicit.container, 'axis-label').map((t) => t.textContent)
    expect(labels).toContain('100')
    expect(labels).not.toContain('120')
  })

  it('draws the grid and both axes, and drops them on request', () => {
    const { container, unmount } = renderChart()
    expect(parts(container, 'grid-line').length).toBeGreaterThan(0)
    expect(parts(container, 'axis')).toHaveLength(2)
    unmount()
    const bare = renderChart({ grid: false, valueAxis: 'none', axis: 'none' })
    expect(parts(bare.container, 'grid-line')).toHaveLength(0)
    expect(parts(bare.container, 'axis')).toHaveLength(0)
  })

  it('warns once each about 6 series, a repeated id, no series and over with a target at 0', () => {
    const warn = quiet()
    const six = Array.from({ length: 6 }, (_, i) => ({
      id: `s${i}`,
      label: `S${i}`,
      value: () => 1,
    }))
    renderChart({ series: six }).unmount()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('tones repeat from 6')
    warn.mockClear()
    renderChart({
      series: [three[0] as BarSeries<Month>, three[0] as BarSeries<Month>],
    }).unmount()
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockClear()
    const empty = renderChart({ series: [] })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(empty.container.querySelector('[data-ch-part="empty"]')?.textContent).toBe('No data')
    empty.unmount()
    warn.mockClear()
    const zero = renderChart({ target: { value: 0, over: 'loss' } })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(bars(zero.container).filter((b) => tone(b) === 'loss')).toHaveLength(0)
    warn.mockRestore()
  })
})

describe('<StackedBarChart> points, hit areas, tooltip and table', () => {
  const hits = (root: HTMLElement) => parts(root, 'bar-hit')
  /** The hit areas of category column `row` (vertical), top-down. */
  function hitColumn(root: HTMLElement, index: number) {
    const all = hits(root)
    const xs = [...new Set(all.map((h) => num(h, 'x')))].sort((a, b) => a - b)
    return all.filter((h) => num(h, 'x') === xs[index]).sort((a, b) => num(a, 'y') - num(b, 'y'))
  }
  /** Asserts the rects tile [-top, -top + size] along y: contiguous, no overlap. */
  function expectTiles(rects: SVGElement[], top: number, size: number) {
    let edge = -top
    for (const r of rects) {
      expect(num(r, 'y')).toBeCloseTo(edge)
      expect(num(r, 'height')).toBeGreaterThanOrEqual(0)
      edge += num(r, 'height')
    }
    expect(edge).toBeCloseTo(-top + size)
  }
  const chartOf = () => screen.getByRole('application', { name: 'Monthly cost against budget' })
  const liveOf = (root: HTMLElement) => root.querySelector('[aria-live="polite"]') as HTMLElement

  it('treats a non-finite or negative gap as 0', () => {
    for (const gap of [Number.NaN, -1]) {
      const { container, unmount } = renderChart({ gap })
      const [labor, materials] = column(container, 0) as [SVGElement, SVGElement]
      expect(num(labor, 'y')).toBeCloseTo(yOf(24))
      expect(bottom(materials)).toBeCloseTo(num(labor, 'y'))
      unmount()
    }
  })

  it('shows the category, the series, its value and the stack total on hover', () => {
    const { container } = renderChart()
    // Row by row, series order inside: Apr materials is the 11th hit area.
    fireEvent.pointerEnter(hits(container)[10] as Element)
    const tip = container.querySelector('[data-ch-part="tooltip"]')
    for (const text of ['Apr', 'Materials', '21', 'Total', '66'])
      expect(tip).toHaveTextContent(text)
  })

  it('selects with a composite id, the series and the user row', () => {
    const onSelect = vi.fn()
    const { container, unmount } = renderChart({ onSelect })
    fireEvent.click(hits(container)[10] as Element)
    expect(onSelect).toHaveBeenCalledTimes(1)
    const [id, point] = onSelect.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(id).toBe('3:materials')
    expect(point).toMatchObject({ seriesId: 'materials', series: 'Materials', datum: months[3] })
    unmount()
    const byId = vi.fn()
    const named = renderChart({ onSelect: byId, id: 'month' })
    fireEvent.click(hits(named.container)[10] as Element)
    expect(byId.mock.calls[0]?.[0]).toBe('Apr:materials')
  })

  it('walks the segments stack by stack with the arrow keys and announces the series first', () => {
    const { container } = renderChart()
    const chart = chartOf()
    const seen: string[] = []
    for (let i = 0; i < 4; i++) {
      fireEvent.keyDown(chart, { key: 'ArrowRight' })
      seen.push(liveOf(container).textContent ?? '')
    }
    expect(seen).toEqual([
      'Labor, 1 of 6, Jan, 24',
      'Materials, 1 of 6, Jan, 18',
      'Subcontract, 1 of 6, Jan, 9',
      'Labor, 2 of 6, Feb, 26',
    ])
  })

  it('tiles the full chart height with the hit areas of a stack, also with mixed signs', () => {
    const { container, unmount } = renderChart()
    const jan = hitColumn(container, 0)
    expect(jan).toHaveLength(3)
    expectTiles(jan, 24, HEIGHT)
    // Bottom-up: labor's area meets materials' in the middle of the 2 px gap above 24.
    expect(bottom(jan[1] as SVGElement)).toBeCloseTo(yOf(24) + 1)
    // A hit area spans the band, as the bars do.
    const bar = column(container, 0)[0] as SVGElement
    expect(num(jan[0] as SVGElement, 'x')).toBeCloseTo(num(bar, 'x'))
    expect(num(jan[0] as SVGElement, 'width')).toBeCloseTo(num(bar, 'width'))
    unmount()

    type Mixed = { k: string; a: number; b: number; c: number; d: number }
    const series: BarSeries<Mixed>[] = (['a', 'b', 'c', 'd'] as const).map((key) => ({
      id: key,
      label: key.toUpperCase(),
      value: key,
    }))
    const mixed = render(
      <StackedBarChart<Mixed>
        data={[
          { k: 'A', a: 10, b: -4, c: 5, d: -6 },
          { k: 'B', a: -3, b: -2, c: -1, d: -1 },
        ]}
        x="k"
        series={series}
        width={300}
        height={HEIGHT}
        domain={[-20, 20]}
        target={{ value: 12, over: 'loss' }}
        title="Mixed"
        animate={false}
      />,
    )
    const y = (v: number) => PLOT - ((v + 20) * PLOT) / 40
    const a = hitColumn(mixed.container, 0)
    expect(a).toHaveLength(4)
    expectTiles(a, 24, HEIGHT)
    // Top-down: c (outermost up), a, b, d (outermost down); a and b meet at zero.
    expect(bottom(a[1] as SVGElement)).toBeCloseTo(y(0))
    // All negative: the first segment reaches the top edge.
    const b = hitColumn(mixed.container, 1)
    expect(b).toHaveLength(4)
    expectTiles(b, 24, HEIGHT)
  })

  it('tiles the full chart width in a horizontal chart', () => {
    const { container } = renderChart({ orientation: 'horizontal', height: undefined })
    const all = hits(container)
    const ys = [...new Set(all.map((h) => num(h, 'y')))].sort((a, b) => a - b)
    const first = all.filter((h) => num(h, 'y') === ys[0]).sort((a, b) => num(a, 'x') - num(b, 'x'))
    expect(first).toHaveLength(3)
    let edge = -96
    for (const r of first) {
      expect(num(r, 'x')).toBeCloseTo(edge)
      edge += num(r, 'width')
    }
    expect(edge).toBeCloseTo(300 - 96)
  })

  it('marks both pieces of a segment split at the target active and dims every other piece', () => {
    const { container } = renderChart({
      target: { value: 60, over: 'loss' },
      activeId: '3:subcontract',
      dimInactive: true,
    })
    const all = bars(container)
    expect(all).toHaveLength(20)
    const active = all.filter((b) => b.hasAttribute('data-ch-active'))
    expect(active).toHaveLength(2)
    expect(active.map(tone).sort()).toEqual(['loss', 'warn'])
    for (const b of active)
      expect(num(b, 'x')).toBeCloseTo(num(column(container, 3)[0] as SVGElement, 'x'))
    expect(all.filter((b) => b.hasAttribute('data-ch-dimmed'))).toHaveLength(18)
  })

  it('gives a missing or zero value no point and no hit area; the table shows the zero only', () => {
    const warn = quiet()
    const data = months.map((m) =>
      m.month === 'Feb'
        ? { ...m, materials: null }
        : m.month === 'Mar'
          ? { ...m, materials: 0 }
          : m,
    )
    const { container } = renderChart({ data })
    expect(hits(container)).toHaveLength(16)
    expectTiles(hitColumn(container, 1), 24, HEIGHT)
    const chart = chartOf()
    const seen: string[] = []
    for (let i = 0; i < 7; i++) {
      fireEvent.keyDown(chart, { key: 'ArrowRight' })
      seen.push(liveOf(container).textContent ?? '')
    }
    // Jan ×3, Feb labor, Feb subcontract, Mar labor, Mar subcontract.
    expect(seen[4]).toMatch(/^Subcontract.*Feb/)
    expect(seen[6]).toMatch(/^Subcontract.*Mar/)
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(within(rows[2] as HTMLElement).getAllByRole('cell')[1]?.textContent).toBe('—no value')
    expect(within(rows[3] as HTMLElement).getAllByRole('cell')[1]?.textContent).toBe('0')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('registers the same points array again when re-rendered with the same props', () => {
    const props: StackedBarChartProps<Month> = {
      data: months,
      x: 'month',
      series: three,
      width: 300,
      title: 'Monthly cost against budget',
      animate: false,
    }
    const { rerender } = render(<StackedBarChart<Month> {...props} />)
    const first = registered.at(-1)
    expect(first).toHaveLength(18)
    rerender(<StackedBarChart<Month> {...props} />)
    rerender(<StackedBarChart<Month> {...props} />)
    expect(registered.at(-1)).toBe(first)
  })

  it('shows a missing total cell for a row with no segments', () => {
    const data = months.map((m) =>
      m.month === 'Feb' ? { ...m, labor: null, materials: null, subcontract: null } : m,
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderChart({ data })
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    const cells = within(rows[2] as HTMLElement).getAllByRole('cell')
    expect(cells[cells.length - 1]?.textContent).toBe('—no value')
    warn.mockRestore()
  })

  it('renders a hidden table with a total column, and renames or drops it on request', () => {
    const headers = () =>
      within(screen.getByRole('table'))
        .getAllByRole('columnheader')
        .map((th) => th.textContent)
    const { unmount } = renderChart()
    const table = screen.getByRole('table', { name: 'Monthly cost against budget' })
    expect(headers()).toEqual(['Month', 'Labor', 'Materials', 'Subcontract', 'Total'])
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(7)
    const apr = within(rows[4] as HTMLElement).getAllByRole('cell')
    expect(apr.at(-1)?.textContent).toBe('66')
    unmount()
    const renamed = renderChart({ dataTable: { columns: { Total: 'Cost' } } })
    expect(headers()).toEqual(['Month', 'Labor', 'Materials', 'Subcontract', 'Cost'])
    renamed.unmount()
    renderChart({ dataTable: false })
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('draws no tooltip when tooltip is false, and passes the user row to a function tooltip', () => {
    const off = renderChart({ tooltip: false })
    fireEvent.pointerEnter(hits(off.container)[0] as Element)
    expect(off.container.querySelector('[data-ch-part="tooltip"]')).toBeNull()
    off.unmount()
    const seen: unknown[] = []
    const custom = renderChart({
      tooltip: (point) => {
        seen.push(point.datum)
        return <span>custom</span>
      },
    })
    fireEvent.pointerEnter(hits(custom.container)[10] as Element)
    expect(custom.container.querySelector('[data-ch-part="tooltip"]')).toHaveTextContent('custom')
    expect(seen).toContain(months[3])
  })
})

describe('<StackedBarChart> target label', () => {
  const labelled = { value: 60, label: 'budget $60k', over: 'loss' } as const
  const targetLabels = (root: HTMLElement) => parts(root, 'target-label')
  const line = (root: HTMLElement) => parts(root, 'target')[0] as SVGElement
  /** The right edge of the last column's bars. */
  const plotRight = (root: HTMLElement) =>
    Math.max(...bars(root).map((b) => num(b, 'x') + num(b, 'width')))

  it('draws the label in the right margin, centred on the line, and widens that margin', () => {
    const { container, unmount } = renderChart({ target: labelled })
    const labels = targetLabels(container)
    expect(labels).toHaveLength(1)
    const label = labels[0] as SVGElement
    expect(label.textContent).toBe('budget $60k')
    expect(label.getAttribute('text-anchor')).toBe('start')
    expect(label.getAttribute('dominant-baseline')).toBe('middle')
    expect(num(label, 'y')).toBeCloseTo(num(line(container), 'y1'))
    // The plot's right edge is where the line ends.
    const right = num(line(container), 'x2')
    expect(num(label, 'x')).toBeGreaterThanOrEqual(right)
    const narrowed = plotRight(container)
    unmount()
    const plain = renderChart({ target: 60 })
    expect(targetLabels(plain.container)).toHaveLength(0)
    expect(plotRight(plain.container)).toBeGreaterThan(narrowed + 40)
  })

  it('draws the label in the top margin of a horizontal chart, centred on the line', () => {
    const { container } = renderChart({
      orientation: 'horizontal',
      height: undefined,
      target: labelled,
    })
    const label = targetLabels(container)[0] as SVGElement
    expect(targetLabels(container)).toHaveLength(1)
    expect(num(label, 'y')).toBeLessThan(0)
    expect(num(label, 'y')).toBeCloseTo(-6)
    expect(label.getAttribute('text-anchor')).toBe('middle')
    expect(num(label, 'x')).toBeCloseTo(num(line(container), 'x1'))
    // 6 rows × 40 + top 24 + bottom 28.
    expect(container.querySelector('svg')?.getAttribute('height')).toBe('292')
  })

  it('keeps a horizontal label inside the svg when the line is near an edge', () => {
    const { container } = renderChart({
      orientation: 'horizontal',
      height: undefined,
      target: { value: 79, label: 'a long budget label' },
    })
    const label = targetLabels(container)[0] as SVGElement
    const half = ('a long budget label'.length * 6.5) / 2
    // Plot coordinates: the svg ends at 300 - left margin 96.
    expect(num(label, 'x') + half).toBeLessThanOrEqual(300 - 96 + 0.01)
    expect(num(label, 'x')).toBeLessThan(num(line(container), 'x1'))
  })

  it('draws no label when the target is outside the domain, and keeps the margins', () => {
    const warn = quiet()
    const { container, unmount } = renderChart({
      domain: [0, 50],
      target: { value: 60, label: 'budget $60k' },
    })
    expect(targetLabels(container)).toHaveLength(0)
    const outside = plotRight(container)
    unmount()
    const none = renderChart({ domain: [0, 50] })
    expect(plotRight(none.container)).toBeCloseTo(outside)
    warn.mockRestore()
  })

  it('leaves the margins as before for a target without a label, and respects an explicit margin', () => {
    const { container, unmount } = renderChart()
    const base = plotRight(container)
    unmount()
    const plain = renderChart({ target: 60 })
    expect(plotRight(plain.container)).toBeCloseTo(base)
    plain.unmount()
    const horizontal = renderChart({ orientation: 'horizontal', height: undefined, target: 60 })
    expect(horizontal.container.querySelector('svg')?.getAttribute('height')).toBe('276')
    horizontal.unmount()
    const explicit = renderChart({ target: labelled, margin: { right: 0 } })
    expect(plotRight(explicit.container)).toBeCloseTo(base)
    expect(targetLabels(explicit.container)).toHaveLength(1)
  })
})

describe('<StackedBarChart> total labels clear the target line', () => {
  const labelsOf = (root: HTMLElement) => parts(root, 'value-label')
  const xOf = (v: number) => (v * 156) / 80 // horizontal: 300 − 96 − 48 px for [0, 80]

  it('lifts a vertical total label that the target line would cross to 4 px above it', () => {
    const { container } = renderChart({ width: 584, target: 60 })
    const [jan, feb, mar, apr, may] = labelsOf(container) as SVGElement[]
    const lineY = yOf(60)
    for (const label of [feb, mar, may] as SVGElement[])
      expect(num(label, 'y')).toBeCloseTo(lineY - 4)
    expect(num(jan as SVGElement, 'y')).toBeCloseTo(yOf(51) - 6)
    expect(num(apr as SVGElement, 'y')).toBeCloseTo(yOf(66) - 6)
  })

  it('moves a horizontal total label that the target line would cross to 6 px right of it', () => {
    const { container } = renderChart({ orientation: 'horizontal', height: undefined, target: 60 })
    const labels = labelsOf(container)
    expect(num(labels[1] as SVGElement, 'x')).toBeCloseTo(xOf(60) + 6)
    // Mar (58) starts 2.1 px right of the line, just outside the 2 px slack: it stays.
    expect(num(labels[2] as SVGElement, 'x')).toBeCloseTo(xOf(58) + 6)
    expect(num(labels[3] as SVGElement, 'x')).toBeCloseTo(xOf(66) + 6)
  })

  it('leaves the labels at the stack end without a target', () => {
    const { container } = renderChart({ width: 584 })
    const labels = labelsOf(container)
    expect(num(labels[1] as SVGElement, 'y')).toBeCloseTo(yOf(56) - 6)
    expect(num(labels[2] as SVGElement, 'y')).toBeCloseTo(yOf(58) - 6)
  })
})
