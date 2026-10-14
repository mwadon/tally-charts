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
      axis: 'none',
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
})
