import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { type BarSeries, GroupedBarChart, type GroupedBarChartProps } from './GroupedBarChart'

type Quarter = {
  quarter: string
  north: number | null
  south: number | null
  west: number | null
  forecast?: boolean
}
const quarters: Quarter[] = [
  { quarter: 'Q1', north: 42, south: 35, west: 18 },
  { quarter: 'Q2', north: 48, south: 38, west: 27 },
  { quarter: 'Q3', north: 55, south: 36, west: 33 },
  { quarter: 'Q4', north: 61, south: 44, west: 41, forecast: true },
]
const three: BarSeries<Quarter>[] = [
  { id: 'north', label: 'North', value: 'north' },
  { id: 'south', label: 'South', value: 'south' },
  { id: 'west', label: 'West', value: 'west' },
]

function renderChart(props: Partial<GroupedBarChartProps<Quarter>> = {}) {
  return render(
    <GroupedBarChart<Quarter>
      data={quarters}
      x="quarter"
      series={three}
      width={300}
      title="Jobs completed by crew"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, part: string) => [
  ...root.querySelectorAll<SVGElement>(`[data-ch-part="${part}"]`),
]
const num = (el: Element, attr: string) => Number(el.getAttribute(attr))
// Layers draw one series after another: the DOM order is series-major, not group-major.
const bars = (root: HTMLElement) => parts(root, 'bar')
const ROWS = 4
/** The bars of group `row`, in series order (three series, no missing values). */
const group = (root: HTMLElement, row: number) =>
  [0, 1, 2].map((s) => bars(root)[s * ROWS + row] as SVGElement)
const quiet = () => vi.spyOn(console, 'warn').mockImplementation(() => {})

describe('<GroupedBarChart>', () => {
  it('draws one bar per series in every group, side by side with the gap between them', () => {
    const { container } = renderChart()
    expect(bars(container)).toHaveLength(12)
    const [a, b, c] = group(container, 0) as [SVGElement, SVGElement, SVGElement]
    expect(num(a, 'x')).toBeLessThan(num(b, 'x'))
    expect(num(b, 'x')).toBeLessThan(num(c, 'x'))
    expect(num(a, 'width')).toBeCloseTo(num(b, 'width'))
    expect(num(b, 'width')).toBeCloseTo(num(c, 'width'))
    expect(num(b, 'x') - (num(a, 'x') + num(a, 'width'))).toBeCloseTo(4)
    expect(num(c, 'x') - (num(b, 'x') + num(b, 'width'))).toBeCloseTo(4)
  })

  it('uses the default tone order and lets an explicit tone win', () => {
    const { container, unmount } = renderChart()
    expect(group(container, 0).map((b) => b.getAttribute('data-ch-tone'))).toEqual([
      'accent',
      'accent-soft',
      'warn',
    ])
    unmount()
    quiet()
    const many: BarSeries<Quarter>[] = Array.from({ length: 6 }, (_, i) => ({
      id: `s${i}`,
      label: `S${i}`,
      value: 'north',
    }))
    const six = renderChart({ series: many })
    expect(
      bars(six.container)
        .filter((_, i) => i % ROWS === 0)
        .map((b) => b.getAttribute('data-ch-tone')),
    ).toEqual(['accent', 'accent-soft', 'warn', 'neutral', 'gain', 'accent'])
    six.unmount()
    const explicit = renderChart({
      series: [{ id: 'north', label: 'North', value: 'north', tone: 'gain' }],
    })
    expect(bars(explicit.container)[0]?.getAttribute('data-ch-tone')).toBe('gain')
    vi.restoreAllMocks()
  })

  it('applies a series fill, and a row fill over every bar of that row', () => {
    const { container, unmount } = renderChart({
      series: [{ id: 'north', label: 'North', value: 'north', fill: 'hatch-fade' }],
    })
    expect(new Set(bars(container).map((b) => b.getAttribute('data-ch-fill')))).toEqual(
      new Set(['hatch-fade']),
    )
    unmount()
    const row = renderChart({ fill: (d) => (d.forecast ? 'hatch' : undefined) })
    const fillOf = (b: SVGElement) => b.getAttribute('data-ch-fill')
    expect(group(row.container, 3).map(fillOf)).toEqual(['hatch', 'hatch', 'hatch'])
    expect(new Set([0, 1, 2].flatMap((r) => group(row.container, r).map(fillOf)))).toEqual(
      new Set(['solid']),
    )
  })

  it('leaves the slot of a missing value empty and keeps the other bars in place', () => {
    const warn = quiet()
    const data = quarters.map((q) => (q.quarter === 'Q2' ? { ...q, south: null } : q))
    const { container } = renderChart({ data })
    const all = bars(container)
    expect(all).toHaveLength(11)
    // North has 4 bars (0-3), south 3 (4-6), west 4 (7-10).
    const northQ1 = all[0] as SVGElement
    const northQ2 = all[1] as SVGElement
    const westQ1 = all[7] as SVGElement
    const westQ2 = all[8] as SVGElement
    expect(num(westQ2, 'x') - num(northQ2, 'x')).toBeCloseTo(num(westQ1, 'x') - num(northQ1, 'x'))
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('missing or non-numeric')
    warn.mockRestore()
  })

  it('draws negative and mixed values below the baseline with no negative height', () => {
    const data = [
      { quarter: 'A', north: -5, south: 10, west: 0 },
      { quarter: 'B', north: -8, south: -3, west: 2 },
    ]
    const { container } = renderChart({ data })
    const all = bars(container)
    expect(all.some((b) => b.getAttribute('data-ch-direction') === 'down')).toBe(true)
    for (const b of all) expect(num(b, 'height')).toBeGreaterThanOrEqual(0)
  })

  it('puts the label of a down bar that does not fit below it above its base, not over the bar', () => {
    const data = [{ quarter: 'A', north: -8, south: 10, west: 0 }]
    const { container } = renderChart({ data, height: 200, domain: [-8, 10] })
    const bar = bars(container).find(
      (b) => b.getAttribute('data-ch-direction') === 'down',
    ) as SVGElement
    const label = parts(container, 'value-label').find((l) =>
      l.textContent?.includes('8'),
    ) as SVGElement
    expect(label).toBeDefined()
    const y = num(label, 'y')
    expect(y).toBeLessThan(num(bar, 'y'))
    expect(y).toBeCloseTo(num(bar, 'y') - 6)
  })

  it('lays out horizontally: bars of a group share x and step down, with an automatic height', () => {
    const { container } = renderChart({ orientation: 'horizontal' })
    const [a, b, c] = group(container, 0) as [SVGElement, SVGElement, SVGElement]
    expect(num(a, 'x')).toBeCloseTo(num(b, 'x'))
    expect(num(b, 'x')).toBeCloseTo(num(c, 'x'))
    expect(num(a, 'y')).toBeLessThan(num(b, 'y'))
    expect(num(b, 'y')).toBeLessThan(num(c, 'y'))
    // 4 rows × (3 × 16 + 2 × 4 + 20) + 8 + 28
    expect(container.querySelector('svg')?.getAttribute('height')).toBe('340')
  })

  it('draws the grid and both axes, and drops them on request', () => {
    const { container, unmount } = renderChart()
    expect(parts(container, 'grid-line').length).toBeGreaterThan(0)
    expect(parts(container, 'axis')).toHaveLength(2)
    unmount()
    const noGrid = renderChart({ grid: false })
    expect(parts(noGrid.container, 'grid-line')).toHaveLength(0)
    noGrid.unmount()
    const noValueAxis = renderChart({ valueAxis: 'none' })
    expect(parts(noValueAxis.container, 'grid-line')).toHaveLength(0)
    expect(parts(noValueAxis.container, 'axis')).toHaveLength(1)
  })

  it('rules vertical grid lines for a horizontal chart', () => {
    const { container } = renderChart({ orientation: 'horizontal' })
    const lines = parts(container, 'grid-line')
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) expect(line.getAttribute('x1')).toBe(line.getAttribute('x2'))
    expect(parts(container, 'axis')).toHaveLength(2)
  })

  it('draws the target and fits it in the domain', () => {
    const data = quarters.map((q) => ({ ...q, north: 10, south: 12, west: 8 }))
    const { container } = renderChart({ data, target: { value: 50, label: 'Target' } })
    expect(parts(container, 'target')).toHaveLength(1)
    expect(parts(container, 'target-label')[0]?.textContent).toBe('Target')
    const line = parts(container, 'target')[0] as SVGElement
    expect(num(line, 'y1')).toBeGreaterThanOrEqual(0)
  })

  it('uses an explicit domain as given', () => {
    const { container } = renderChart({ domain: [0, 100] })
    const labels = parts(container, 'axis-label').map((t) => t.textContent)
    expect(labels).toContain('100')
    expect(labels).not.toContain('120')
  })

  it('warns once about more than 4 series, a repeated id and no series', () => {
    const warn = quiet()
    const five: BarSeries<Quarter>[] = Array.from({ length: 5 }, (_, i) => ({
      id: `s${i}`,
      label: `S${i}`,
      value: 'north',
    }))
    renderChart({ series: five }).unmount()
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockClear()
    renderChart({
      series: [three[0] as BarSeries<Quarter>, three[0] as BarSeries<Quarter>],
    }).unmount()
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockClear()
    const empty = renderChart({ series: [] })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(empty.container.querySelector('[data-ch-part="empty"]')?.textContent).toBe('No data')
    warn.mockRestore()
  })

  it('renders at 60 px wide without a negative bar width', () => {
    const { container } = renderChart({ width: 60 })
    const all = bars(container)
    expect(all).toHaveLength(12)
    for (const b of all) expect(num(b, 'width')).toBeGreaterThanOrEqual(0)
  })
})

describe('<GroupedBarChart> points, labels, tooltip and table', () => {
  const hits = (root: HTMLElement) => parts(root, 'bar-hit')
  const labelsOf = (root: HTMLElement) => parts(root, 'value-label')
  const wide = 584

  it('shows a tooltip with the category, the series and the value on hover', () => {
    const { container } = renderChart()
    // Group-major: Q1 north, south, west, Q2 ... so Q3 south is the 8th slice.
    fireEvent.pointerEnter(hits(container)[7] as Element)
    const tip = container.querySelector('[data-ch-part="tooltip"]')
    expect(tip).toHaveTextContent('Q3')
    expect(tip).toHaveTextContent('South')
    expect(tip).toHaveTextContent('36')
  })

  it('selects with a composite id, the series and the user row', () => {
    const onSelect = vi.fn()
    const { container, unmount } = renderChart({ onSelect })
    fireEvent.click(hits(container)[7] as Element)
    expect(onSelect).toHaveBeenCalledTimes(1)
    const [id, point] = onSelect.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(id).toBe('2:south')
    expect(point).toMatchObject({ seriesId: 'south', series: 'South', datum: quarters[2] })
    unmount()
    const byId = vi.fn()
    const named = renderChart({ onSelect: byId, id: 'quarter' })
    fireEvent.click(hits(named.container)[7] as Element)
    expect(byId.mock.calls[0]?.[0]).toBe('Q3:south')
  })

  it('keeps bars selectable when composite ids collide, without a React key warning', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rows = [
      { k: 'a:b', one: 1, two: 2 },
      { k: 'a', one: 3, two: 4 },
    ]
    const onSelect = vi.fn()
    const { container } = render(
      <GroupedBarChart
        data={rows}
        x="k"
        id="k"
        series={[
          { id: 'c', label: 'One', value: 'one' },
          { id: 'b:c', label: 'Two', value: 'two' },
        ]}
        width={300}
        title="Collisions"
        animate={false}
        onSelect={onSelect}
      />,
    )
    expect(bars(container)).toHaveLength(4)
    expect(hits(container)).toHaveLength(4)
    fireEvent.click(hits(container)[0] as Element)
    fireEvent.click(hits(container)[3] as Element)
    expect(onSelect.mock.calls.map((c) => (c[1] as { seriesId: string }).seriesId)).toEqual([
      'c',
      'b:c',
    ])
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('visits bars in visual order with the arrow keys and announces the series first', () => {
    const { container } = renderChart()
    const chart = screen.getByRole('application', { name: 'Jobs completed by crew' })
    const live = container.querySelector('[aria-live="polite"]') as HTMLElement
    const seen: string[] = []
    for (let i = 0; i < 4; i++) {
      fireEvent.keyDown(chart, { key: 'ArrowRight' })
      seen.push(live.textContent ?? '')
    }
    expect(seen.map((t) => t.split(',')[0])).toEqual(['North', 'South', 'West', 'North'])
    expect(seen.map((t) => /Q\d/.exec(t)?.[0])).toEqual(['Q1', 'Q1', 'Q1', 'Q2'])
  })

  it('marks one controlled active bar and dims the other eleven', () => {
    const { container } = renderChart({ activeId: '2:south', dimInactive: true })
    const all = bars(container)
    expect(all.filter((b) => b.hasAttribute('data-ch-active'))).toHaveLength(1)
    expect(all.filter((b) => b.hasAttribute('data-ch-dimmed'))).toHaveLength(11)
  })

  it('gives a missing value no hit slice, no point and an empty table cell', () => {
    const warn = quiet()
    const data = quarters.map((q) => (q.quarter === 'Q2' ? { ...q, south: null } : q))
    const { container } = renderChart({ data })
    expect(hits(container)).toHaveLength(11)
    const chart = screen.getByRole('application', { name: 'Jobs completed by crew' })
    const live = container.querySelector('[aria-live="polite"]') as HTMLElement
    for (let i = 0; i < 5; i++) fireEvent.keyDown(chart, { key: 'ArrowRight' })
    // Q1 north, south, west, Q2 north, then Q2 west: the empty slot is skipped.
    expect(live.textContent).toMatch(/^West/)
    expect(live.textContent).toContain('Q2')
    const rowCells = within(screen.getByRole('table')).getAllByRole('row')[2] as HTMLElement
    expect(within(rowCells).getAllByRole('cell')[1]?.textContent).toBe('—no value')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })

  it('labels every bar when the labels fit, and none when they do not', () => {
    const { container, unmount } = renderChart({ width: wide })
    expect(labelsOf(container)).toHaveLength(12)
    expect(labelsOf(container)[0]?.textContent).toBe('42')
    unmount()
    const narrow = renderChart({ width: 200 })
    expect(labelsOf(narrow.container)).toHaveLength(0)
    narrow.unmount()
    const none = renderChart({ width: wide, valueLabel: 'none' })
    expect(labelsOf(none.container)).toHaveLength(0)
  })

  it('always labels a horizontal chart, and lets valueFormat win over format', () => {
    const { container, unmount } = renderChart({ orientation: 'horizontal', width: 200 })
    expect(labelsOf(container)).toHaveLength(12)
    unmount()
    const formatted = renderChart({ width: wide, format: 'percent', valueFormat: 'hours' })
    expect(labelsOf(formatted.container)[0]?.textContent).not.toContain('%')
    expect(labelsOf(formatted.container)[0]?.textContent).toContain('h')
    formatted.unmount()
    const fallback = renderChart({ width: wide, format: 'hours' })
    expect(labelsOf(fallback.container)[0]?.textContent).toContain('h')
  })

  it('renders a hidden table with a column per series, and renames or drops it on request', () => {
    const { unmount } = renderChart()
    const table = screen.getByRole('table', { name: 'Jobs completed by crew' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Quarter', 'North', 'South', 'West'])
    expect(within(table).getAllByRole('row')).toHaveLength(5)
    unmount()
    const renamed = renderChart({ dataTable: { columns: { North: 'North crew' } } })
    expect(
      within(screen.getByRole('table'))
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Quarter', 'North crew', 'South', 'West'])
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
    fireEvent.pointerEnter(hits(custom.container)[7] as Element)
    expect(custom.container.querySelector('[data-ch-part="tooltip"]')).toHaveTextContent('custom')
    expect(seen).toContain(quarters[2])
  })
})
