import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LineChart, type LineChartProps, type LineSeries } from './LineChart'

type Month = {
  month: string
  actual: number | null
  path: number | null
  changes: number | null
  low: number | null
  high: number | null
}
// The forecasts and the band start at the last actual (Jul) so the lines join there.
const months: Month[] = [
  { month: 'Jun', actual: 34, path: null, changes: null, low: null, high: null },
  { month: 'Jul', actual: 32, path: 32, changes: 32, low: 32, high: 32 },
  { month: 'Aug', actual: null, path: 35, changes: 36, low: 34, high: 37 },
  { month: 'Sep', actual: null, path: 36, changes: 38, low: 34, high: 38 },
]
const series: LineSeries<Month>[] = [
  { id: 'actual', label: 'Actual', value: 'actual' },
  {
    id: 'path',
    label: 'Current path',
    value: 'path',
    style: 'forecast',
    tooltipLabel: 'on the current path',
  },
  {
    id: 'changes',
    label: 'With your changes',
    value: 'changes',
    style: 'scenario',
    tooltipLabel: 'with changes',
  },
]

// 400 × 100 with no margin: months at x 50, 150, 250, 350; y = 100 − 10 × (v − 30).
function renderLines(props: Partial<LineChartProps<Month>> = {}) {
  return render(
    <LineChart<Month>
      data={months}
      x="month"
      series={series}
      band={{ low: 'low', high: 'high', label: 'Likely range' }}
      domain={[30, 40]}
      format="percent"
      width={400}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      title="Margin outlook"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, part: string) => [
  ...root.querySelectorAll(`[data-ch-part="${part}"]`),
]
const groups = (root: HTMLElement) => parts(root, 'line-group') as [Element, Element, Element]
const pathOf = (group: Element) => group.querySelector('[data-ch-part="line"]')
const tooltip = (root: HTMLElement) => root.querySelector('[data-ch-part="tooltip"]')
const live = (root: HTMLElement) => root.querySelector('[aria-live]')?.textContent

describe('<LineChart>', () => {
  it('draws the forecasts first and the actual line on top', () => {
    const { container } = renderLines()
    expect(parts(container, 'line-group')).toHaveLength(3)
    const [path, changes, actual] = groups(container)
    expect(pathOf(path)).toHaveAttribute('d', 'M150,80L250,50L350,40')
    expect(pathOf(path)).toHaveAttribute('data-ch-dashed', 'true')
    expect(path.querySelectorAll('[data-ch-hollow="true"]')).toHaveLength(3)
    expect(changes).toHaveAttribute('data-ch-tone', 'gain')
    expect(pathOf(changes)).toHaveAttribute('d', 'M150,80L250,40L350,20')
    expect(pathOf(changes)).toHaveAttribute('data-ch-dashed', 'true')
    expect(changes.querySelectorAll('[data-ch-hollow]')).toHaveLength(0)
    expect(actual).toHaveAttribute('data-ch-tone', 'accent')
    expect(pathOf(actual)).toHaveAttribute('d', 'M50,60L150,80')
    expect(pathOf(actual)).not.toHaveAttribute('data-ch-dashed')
  })

  it('joins the forecast to the last actual', () => {
    const { container } = renderLines()
    const atJul = parts(container, 'line-dot').filter((d) => d.getAttribute('cx') === '150')
    expect(atJul).toHaveLength(3)
    expect(atJul.every((d) => d.getAttribute('cy') === '80')).toBe(true)
    // The last dot drawn at the join, the one on top, is the actual's filled dot.
    const top = atJul[atJul.length - 1] as Element
    expect(top).not.toHaveAttribute('data-ch-hollow')
    const group = top.closest('[data-ch-part="line-group"]') as Element
    expect(group).toHaveAttribute('data-ch-tone', 'accent')
    expect(pathOf(group)).not.toHaveAttribute('data-ch-dashed')
  })

  it('draws the likely range, the forecast region, the grid and the target', () => {
    const { container } = renderLines({
      forecastFrom: 'Aug',
      target: { value: 38, label: 'Target 38%' },
    })
    expect(parts(container, 'band')[0]).toHaveAttribute(
      'd',
      'M150,80L250,30L350,20L350,60L250,60L150,80Z',
    )
    expect(parts(container, 'region')[0]).toHaveAttribute('x', '200')
    expect(parts(container, 'region')[0]).toHaveAttribute('width', '200')
    expect(parts(container, 'grid-line')).toHaveLength(6)
    expect(parts(container, 'target')[0]).toHaveAttribute('y1', '20')
    expect(parts(container, 'target-label')[0]).toHaveTextContent('Target 38%')
  })

  it('shows one tooltip for every series at an x', () => {
    const { container } = renderLines({ activeId: 'Aug' })
    expect(tooltip(container)).toHaveTextContent(/^Aug35\.0%on the current path36\.0%with changes$/)
    expect(tooltip(container)?.querySelector('[data-ch-tone="gain"]')).toHaveTextContent(
      '36.0%with changes',
    )
    // Every line with a dot at Aug gets a ring.
    expect(parts(container, 'dot-ring').map((r) => r.getAttribute('cx'))).toEqual(['250', '250'])
  })

  it('lists only the series with a value in the tooltip', () => {
    const jun = renderLines({ activeId: 'Jun' })
    expect(tooltip(jun.container)).toHaveTextContent(/^Jun34\.0%Actual$/)
    jun.unmount()
    // At the join the forecasts repeat the actual; the tooltip shows it once.
    const jul = renderLines({ activeId: 'Jul' })
    expect(tooltip(jul.container)).toHaveTextContent(/^Jul32\.0%Actual$/)
    jul.unmount()
    const gap = renderLines({
      activeId: 'Aug',
      data: months.map((m) => (m.month === 'Aug' ? { ...m, path: null } : m)),
    })
    expect(tooltip(gap.container)).toHaveTextContent(/^Aug36\.0%with changes$/)
    // Jul and Sep are lone points of the broken forecast: dots, no segment.
    const [path] = groups(gap.container)
    expect(pathOf(path)).toBeNull()
    expect(path.querySelectorAll('[data-ch-part="line-dot"]')).toHaveLength(2)
    expect(gap.container.innerHTML).not.toContain('NaN')
  })

  it('announces every series at an x for the keyboard', () => {
    const { container } = renderLines()
    const figure = screen.getByRole('figure', { name: 'Margin outlook' })
    fireEvent.keyDown(figure, { key: 'End' })
    expect(live(container)).toBe('Sep, 36.0% on the current path, 38.0% with changes')
    fireEvent.keyDown(figure, { key: 'Home' })
    expect(live(container)).toBe('Jun, 34.0% Actual')
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(live(container)).toBe('Jul, 32.0% Actual')
  })

  it('snaps the pointer to the nearest x', () => {
    const onActiveChange = vi.fn()
    const { container } = renderLines({ onActiveChange })
    const layer = container.querySelector('[data-ch-part="pointer-layer"]') as Element
    // jsdom's bounding box is at 0,0, so client coordinates are plot coordinates.
    fireEvent.pointerMove(layer, { clientX: 230, clientY: 95 })
    expect(onActiveChange).toHaveBeenLastCalledWith(
      'Aug',
      expect.objectContaining({ datum: months[2] }),
    )
  })

  it('selects with Enter and reports the original row', () => {
    const onSelect = vi.fn()
    renderLines({ onSelect })
    const figure = screen.getByRole('figure', { name: 'Margin outlook' })
    fireEvent.keyDown(figure, { key: 'Home' })
    fireEvent.keyDown(figure, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('Jun', expect.objectContaining({ datum: months[0] }))
  })

  it('infers a nice domain from every series and the band, without forcing zero', () => {
    const { container } = renderLines({ domain: undefined })
    // Values run 32–38: one grid line per point, 32 at the bottom, 38 at the top.
    const lines = parts(container, 'grid-line')
    expect(lines).toHaveLength(7)
    expect(lines[0]).toHaveAttribute('y1', '100')
    expect(lines[6]).toHaveAttribute('y1', '0')
  })

  it('rounds the inferred domain to the yAxis tick count, so the ends are labelled', () => {
    const data = [
      { month: 'Jan', v: 31.2 },
      { month: 'Feb', v: 36.8 },
    ]
    const { container } = render(
      <LineChart
        data={data}
        x="month"
        series={[{ id: 'v', label: 'V', value: 'v' }]}
        yAxis={4}
        width={400}
        height={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        title="Four ticks"
        animate={false}
      />,
    )
    // Five ticks would nice the domain to 31–37 and label 32, 34, 36; four nice it to 30–38.
    const left = container.querySelector('[data-ch-part="axis"][data-ch-side="left"]')
    expect([...(left?.children ?? [])].map((el) => el.textContent)).toEqual([
      '30',
      '32',
      '34',
      '36',
      '38',
    ])
    const lines = parts(container, 'grid-line')
    expect(lines[0]).toHaveAttribute('y1', '100')
    expect(lines.at(-1)).toHaveAttribute('y1', '0')
  })

  it('skips a repeated x with one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderLines({
      data: [...months, { ...months[1], actual: 39 } as Month],
    })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('repeated x value "Jul" at index 4')
    const [, , actual] = groups(container)
    expect(pathOf(actual)).toHaveAttribute('d', 'M50,60L150,80')
  })

  it('renders a hidden data table', () => {
    renderLines()
    const table = screen.getByRole('table', { name: 'Margin outlook' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['month', 'Actual', 'Current path', 'With your changes', 'Likely range'])
    const aug = within(table).getAllByRole('row')[3] as HTMLElement
    expect(
      within(aug)
        .getAllByRole('cell')
        .map((td) => td.textContent),
    ).toEqual(['Aug', '', '35.0%', '36.0%', '34.0%–37.0%'])
  })

  it('turns off the grid, the axes and the tooltip', () => {
    const { container } = renderLines({
      grid: false,
      yAxis: 'none',
      xAxis: 'none',
      tooltip: false,
      activeId: 'Aug',
    })
    expect(parts(container, 'grid-line')).toHaveLength(0)
    expect(parts(container, 'axis-label')).toHaveLength(0)
    expect(tooltip(container)).toBeNull()
  })

  it('keeps geometry finite at zero width', () => {
    const { container } = renderLines({ width: 0, forecastFrom: 'Aug' })
    expect(container.innerHTML).not.toContain('NaN')
    expect(screen.getByRole('figure', { name: 'Margin outlook' })).toBeInTheDocument()
    expect(parts(container, 'line-group')).toHaveLength(3)
    for (const el of container.querySelectorAll('svg *')) {
      for (const name of ['cx', 'cy', 'r', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'width', 'height']) {
        const value = el.getAttribute(name)
        if (value !== null && /^-?[\d.]+(e-?\d+)?$/.test(value.trim())) {
          expect(Number.isFinite(Number(value))).toBe(true)
        }
      }
    }
  })

  it('renders empty data without NaN or lines', () => {
    const { container } = renderLines({ data: [], domain: undefined })
    expect(container.innerHTML).not.toContain('NaN')
    expect(container.querySelectorAll('[data-ch-part="line"]')).toHaveLength(0)
  })

  it('centres a single x', () => {
    const { container } = renderLines({ data: [months[0] as Month], domain: undefined })
    expect(container.innerHTML).not.toContain('NaN')
    const dots = parts(container, 'line-dot')
    expect(dots).toHaveLength(1)
    expect(dots[0]).toHaveAttribute('cx', '200')
    fireEvent.keyDown(screen.getByRole('figure', { name: 'Margin outlook' }), { key: 'Home' })
    expect(live(container)).toBe('Jun, 34.0% Actual')
  })

  it('draws nothing for an all-missing series and leaves it out of the tooltip', () => {
    const { container } = renderLines({
      activeId: 'Aug',
      data: months.map((m) => ({ ...m, path: null })),
    })
    const [path] = groups(container)
    expect(pathOf(path)).toBeNull()
    expect(path.querySelectorAll('[data-ch-part="line-dot"]')).toHaveLength(0)
    expect(container.innerHTML).not.toContain('NaN')
    expect(tooltip(container)).toHaveTextContent(/^Aug36\.0%with changes$/)
  })

  it('omits the hidden table with dataTable={false}', () => {
    renderLines({ dataTable: false })
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('widens the inferred domain to a target outside the data', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const flat = [31, 32, 33, 34].map((actual, i) => ({ ...months[0], month: `M${i}`, actual }))
    const { container } = renderLines({
      data: flat as Month[],
      series: [series[0] as LineSeries<Month>],
      band: undefined,
      domain: undefined,
      target: { value: 40, label: 'Target 40%' },
    })
    expect(parts(container, 'target')).toHaveLength(1)
    expect(parts(container, 'target-label')[0]).toHaveTextContent('Target 40%')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('warns once about a missing x and once about a repeated x', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderLines({
      data: [...months, { ...months[1] } as Month, { ...months[0], month: '' } as Month],
    })
    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls[0]?.[0]).toContain('repeated x value "Jul" at index 4')
    expect(warn.mock.calls[1]?.[0]).toContain('missing x value at index 5')
    warn.mockRestore()
  })

  it('warns once about repeated series ids and still draws every series', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const same = series.map((s) => ({ ...s, id: 'same' }))
    const { container } = renderLines({ series: same })
    expect(groups(container)).toHaveLength(3)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toMatch(/^\[tally-charts\] .*series id "same"/)
    expect(error).not.toHaveBeenCalled()
    warn.mockRestore()
    error.mockRestore()
  })
})

describe('<LineChart> axis props', () => {
  it('formats the value axis with yAxisFormat and the x axis and headers with xAxisFormat', () => {
    const { container } = renderLines({
      yAxis: 2,
      yAxisFormat: (v) => `${v} pct`,
      xAxisFormat: (v) => String(v).toUpperCase(),
      activeId: 'Aug',
    })
    const labels = parts(container, 'axis-label').map((el) => el.textContent)
    expect(labels).toEqual(['30 pct', '35 pct', '40 pct', 'JUN', 'JUL', 'AUG', 'SEP'])
    expect(tooltip(container)).toHaveTextContent(/^AUG35\.0%on the current path/)
  })
})

type Reading = { at: string | number | Date | null; actual: number | null; plan: number | null }
const readings: Reading[] = [
  { at: '2026-01-01', actual: 34, plan: null },
  { at: '2026-01-02', actual: 32, plan: 32 },
  { at: '2026-01-04', actual: null, plan: 35 },
]
const readingSeries: LineSeries<Reading>[] = [
  { id: 'actual', label: 'Actual', value: 'actual' },
  { id: 'plan', label: 'Plan', value: 'plan', style: 'forecast' },
]
const JAN_4 = '2026-01-04T00:00:00.000Z'

// 400 × 100 with no margin over Jan 1 – Jan 5: 100px per day; y = 100 − 10 × (v − 30).
function renderTimeLines(props: Partial<LineChartProps<Reading>> = {}) {
  return render(
    <LineChart<Reading>
      data={readings}
      x={{ type: 'time', field: 'at', domain: ['2026-01-01', '2026-01-05'] }}
      series={readingSeries}
      domain={[30, 40]}
      format="percent"
      width={400}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      title="Readings"
      animate={false}
      {...props}
    />,
  )
}

describe('<LineChart> on a time axis', () => {
  it('draws the series at their dates and labels the axis with dates', () => {
    const { container } = renderTimeLines()
    const [plan, actual] = groups(container)
    expect(pathOf(actual)).toHaveAttribute('d', 'M0,60L100,80')
    expect(pathOf(plan)).toHaveAttribute('d', 'M100,80L300,50')
    const labels = parts(container, 'axis-label').map((el) => el.textContent)
    expect(labels.slice(-5)).toEqual(['Jan 1, 2026', 'Jan 2', 'Jan 3', 'Jan 4', 'Jan 5'])
  })

  it('uses ISO ids and writes dates in the tooltip, the announcements and the table', () => {
    const { container, unmount } = renderTimeLines({ activeId: JAN_4 })
    expect(tooltip(container)).toHaveTextContent(/^Jan 4, 202635\.0%Plan$/)
    expect(parts(container, 'dot-ring').map((r) => r.getAttribute('cx'))).toEqual(['300'])
    unmount()
    const again = renderTimeLines()
    fireEvent.keyDown(screen.getByRole('figure', { name: 'Readings' }), { key: 'End' })
    expect(live(again.container)).toBe('Jan 4, 2026, 35.0% Plan')
    const table = screen.getByRole('table', { name: 'Readings' })
    expect(
      within(table)
        .getAllByRole('row')
        .map((row) => row.firstElementChild?.textContent),
    ).toEqual(['at', 'Jan 1, 2026', 'Jan 2, 2026', 'Jan 4, 2026'])
  })

  it('formats dates with xAxisFormat everywhere', () => {
    const { container } = renderTimeLines({ xAxisFormat: 'month', activeId: JAN_4, xAxis: 2 })
    expect(tooltip(container)).toHaveTextContent(/^Jan 202635\.0%Plan$/)
    // The ticks, every other day, would all read "Jan 2026": the axis keeps the first.
    const bottom = container.querySelector('[data-ch-part="axis"][data-ch-side="bottom"]')
    expect([...(bottom?.children ?? [])].map((el) => el.textContent)).toEqual(['Jan 2026'])
  })

  it('sorts rows by date, skips invalid dates and repeats with one warning each', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderTimeLines({
      data: [
        readings[2] as Reading,
        { at: 'someday', actual: 39, plan: null },
        readings[0] as Reading,
        { at: null, actual: 39, plan: null },
        readings[1] as Reading,
        { at: new Date(Date.UTC(2026, 0, 2)), actual: 39, plan: null },
      ],
    })
    const [plan, actual] = groups(container)
    expect(pathOf(actual)).toHaveAttribute('d', 'M0,60L100,80')
    expect(pathOf(plan)).toHaveAttribute('d', 'M100,80L300,50')
    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn.mock.calls[0]?.[0]).toContain('not a date at index 1')
    expect(warn.mock.calls[1]?.[0]).toContain('repeated x value "2026-01-02T00:00:00.000Z"')
  })

  it('steps the keyboard through out-of-order data in date order', () => {
    const { container } = renderTimeLines({
      data: [readings[2] as Reading, readings[0] as Reading, readings[1] as Reading],
    })
    const figure = screen.getByRole('figure', { name: 'Readings' })
    fireEvent.keyDown(figure, { key: 'Home' })
    expect(live(container)).toBe('Jan 1, 2026, 34.0% Actual')
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(live(container)).toBe('Jan 2, 2026, 32.0% Actual')
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(live(container)).toBe('Jan 4, 2026, 35.0% Plan')
    fireEvent.keyDown(figure, { key: 'ArrowLeft' })
    expect(live(container)).toBe('Jan 2, 2026, 32.0% Actual')
    fireEvent.keyDown(figure, { key: 'ArrowLeft' })
    expect(live(container)).toBe('Jan 1, 2026, 34.0% Actual')
  })

  it('skips dates outside an explicit domain: not drawn, not reachable, one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // Jan 2 – Jan 4: 200px per day; Jan 1 would sit at −200px and Jan 9 at 1400px.
    const { container } = renderTimeLines({
      data: [...readings, { at: '2026-01-09', actual: 39, plan: null }],
      x: { type: 'time', field: 'at', domain: ['2026-01-02', '2026-01-04'] },
    })
    const cxs = parts(container, 'line-dot').map((d) => Number(d.getAttribute('cx')))
    expect(cxs.length).toBeGreaterThan(0)
    expect(cxs.every((cx) => cx >= 0 && cx <= 400)).toBe(true)
    for (const path of parts(container, 'line')) {
      const xs = [...(path.getAttribute('d') ?? '').matchAll(/[ML]([-\d.]+),/g)].map((m) =>
        Number(m[1]),
      )
      expect(xs.every((x) => x >= 0 && x <= 400)).toBe(true)
    }
    const figure = screen.getByRole('figure', { name: 'Readings' })
    fireEvent.keyDown(figure, { key: 'Home' })
    expect(live(container)).toBe('Jan 2, 2026, 32.0% Actual')
    fireEvent.keyDown(figure, { key: 'End' })
    expect(live(container)).toBe('Jan 4, 2026, 35.0% Plan')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('skipped a date outside the x domain')
  })

  it('keeps the year on a thinned time axis when the dropped ticks carried it', () => {
    // 22 months at 320px: quarterly ticks are thinned to every other one, which drops "2026".
    const data = Array.from({ length: 22 }, (_, i) => ({ at: Date.UTC(2025, 3 + i, 1), v: i }))
    const { container } = render(
      <LineChart
        data={data}
        x={{ type: 'time', field: 'at' }}
        series={[{ id: 'v', label: 'V', value: 'v' }]}
        width={320}
        title="Months"
        animate={false}
      />,
    )
    const bottom = container.querySelector('[data-ch-part="axis"][data-ch-side="bottom"]')
    expect([...(bottom?.children ?? [])].map((el) => el.textContent)).toEqual([
      'Apr 2025',
      'Oct',
      'Apr 2026',
      'Oct',
    ])
  })

  it('skips a number outside the Date range with the missing-date warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderTimeLines({
      data: [...readings, { at: 1e20, actual: 39, plan: null }],
    })
    const [plan, actual] = groups(container)
    expect(pathOf(actual)).toHaveAttribute('d', 'M0,60L100,80')
    expect(pathOf(plan)).toHaveAttribute('d', 'M100,80L300,50')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('not a date at index 3')
  })

  it('shades the forecast from halfway after the last date before it', () => {
    const { container } = renderTimeLines({ forecastFrom: '2026-01-04' })
    // Halfway between Jan 2 and Jan 4 is Jan 3, at 200px.
    expect(parts(container, 'region')[0]).toHaveAttribute('x', '200')
    expect(parts(container, 'region')[0]).toHaveAttribute('width', '200')
  })

  it('snaps the pointer to the nearest date', () => {
    const onActiveChange = vi.fn()
    const { container } = renderTimeLines({ onActiveChange })
    const layer = container.querySelector('[data-ch-part="pointer-layer"]') as Element
    fireEvent.pointerMove(layer, { clientX: 260, clientY: 50 })
    expect(onActiveChange).toHaveBeenLastCalledWith(
      JAN_4,
      expect.objectContaining({ datum: readings[2] }),
    )
  })

  it('centres a single date without NaN and still snaps the pointer to it', () => {
    const onActiveChange = vi.fn()
    const { container } = renderTimeLines({
      data: [readings[0] as Reading],
      x: { type: 'time', field: 'at' },
      onActiveChange,
    })
    // One date is padded by a day on each side: Dec 31 – Jan 2, with Jan 1 in the middle.
    expect(parts(container, 'line-dot').map((d) => d.getAttribute('cx'))).toEqual(['200'])
    expect(container.innerHTML).not.toContain('NaN')
    const layer = container.querySelector('[data-ch-part="pointer-layer"]') as Element
    fireEvent.pointerMove(layer, { clientX: 205, clientY: 50 })
    expect(onActiveChange).toHaveBeenLastCalledWith('2026-01-01T00:00:00.000Z', expect.anything())
  })

  it('writes dates in the local zone when asked', () => {
    // 22:30 UTC on Mar 29 is already Mar 30 in Europe/Warsaw (vitest.config.ts).
    const { container } = renderTimeLines({
      data: [{ at: '2026-03-29T22:30:00Z', actual: 33, plan: null }],
      x: { type: 'time', field: 'at', zone: 'local' },
      xAxisFormat: 'day',
      activeId: '2026-03-29T22:30:00.000Z',
    })
    expect(tooltip(container)).toHaveTextContent(/^Mar 30, 202633\.0%Actual$/)
  })
})
