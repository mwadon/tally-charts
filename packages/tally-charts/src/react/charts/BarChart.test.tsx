import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BarChart, type BarChartProps } from './BarChart'

type Week = { week: string; margin: number | null }
const weeks: Week[] = [
  { week: 'W1', margin: 30 },
  { week: 'W2', margin: 34 },
  { week: 'W3', margin: 32 },
]

function renderChart(props: Partial<BarChartProps<Week>> = {}) {
  return render(
    <BarChart<Week>
      data={weeks}
      x="week"
      y="margin"
      width={300}
      title="Margin by week"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, part: string) => [
  ...root.querySelectorAll(`[data-ch-part="${part}"]`),
]

describe('<BarChart>', () => {
  it('draws history hatched, the last bar solid, its value and the end labels', () => {
    const { container } = renderChart()
    expect(parts(container, 'bar').map((b) => b.getAttribute('data-ch-fill'))).toEqual([
      'hatch-fade',
      'hatch-fade',
      'solid',
    ])
    expect(parts(container, 'value-label').map((t) => t.textContent)).toEqual(['32'])
    expect(parts(container, 'axis-label').map((t) => t.textContent)).toEqual(['W1', 'W3'])
  })

  it('formats the category axis with axisFormat', () => {
    const { container } = renderChart({ axisFormat: (v) => `Week ${String(v).slice(1)}` })
    expect(parts(container, 'axis-label').map((t) => t.textContent)).toEqual(['Week 1', 'Week 3'])
  })

  it('warns once and shows the categories when axisFormat is not a function', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderChart({ axisFormat: 'percent' })
    expect(parts(container, 'axis-label').map((t) => t.textContent)).toEqual(['W1', 'W3'])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('must be a function on a band or point scale')
    warn.mockRestore()
  })

  it('draws a target from a number or from an object with a label', () => {
    // The inferred domain is [0, 35]; a target outside it would be hidden.
    const { container, unmount } = renderChart({ target: 33 })
    expect(parts(container, 'target')).toHaveLength(1)
    expect(parts(container, 'target-label')).toHaveLength(0)
    unmount()
    const labelled = renderChart({ target: { value: 33, label: 'Target 33' } })
    expect(parts(labelled.container, 'target-label')[0]).toHaveTextContent('Target 33')
  })

  it('lays bars out horizontally with category labels on the left', () => {
    const { container } = renderChart({ orientation: 'horizontal' })
    expect(
      parts(container, 'bar').every((b) => b.getAttribute('data-ch-direction') === 'right'),
    ).toBe(true)
    expect(container.querySelector('[data-ch-part="axis"]')).toHaveAttribute('data-ch-side', 'left')
    // 3 rows × 32px + 8px top + 8px bottom.
    expect(container.querySelector('svg')).toHaveAttribute('height', '112')
  })

  it('hides value labels and the axis on request', () => {
    const { container } = renderChart({ valueLabel: 'none', axis: 'none' })
    expect(parts(container, 'value-label')).toHaveLength(0)
    expect(parts(container, 'axis-label')).toHaveLength(0)
  })

  it('renders a hidden data table by default and formats its values', () => {
    const { unmount } = renderChart({ format: 'percent' })
    const table = screen.getByRole('table', { name: 'Margin by week' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Week', 'Margin'])
    expect(within(table).getByText('34.0%')).toBeInTheDocument()
    unmount()
    renderChart({ dataTable: false })
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('shows a tooltip on hover and renders children after its own marks', () => {
    const { container } = renderChart({ children: <g data-testid="extra" /> })
    fireEvent.pointerEnter(parts(container, 'bar-hit')[1] as Element)
    expect(container.querySelector('[data-ch-part="tooltip"]')).toHaveTextContent('W2')
    expect(screen.getByTestId('extra')).toBeInTheDocument()
  })

  it('names the chart from the element aria-labelledby points at', () => {
    render(
      <>
        <h2 id="ext">Weekly margin</h2>
        <BarChart<Week> data={weeks} x="week" y="margin" width={300} aria-labelledby="ext" />
      </>,
    )
    expect(screen.getByRole('application', { name: 'Weekly margin' })).toBeInTheDocument()
  })

  it('selects with the keyboard', () => {
    const onSelect = vi.fn()
    renderChart({ onSelect })
    const chart = screen.getByRole('application', { name: 'Margin by week' })
    expect(chart).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(chart, { key: 'ArrowRight' })
    fireEvent.keyDown(chart, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(0, expect.objectContaining({ id: 0 }))
  })

  it('renders the empty slot for empty data', () => {
    renderChart({ data: [] })
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('skips a missing value without throwing and reads its table cell as "no value"', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderChart({ data: [...weeks, { week: 'W4', margin: null }] })
    expect(parts(container, 'bar')).toHaveLength(3)
    expect(warn).toHaveBeenCalledTimes(1)
    const cells = within(screen.getByRole('table')).getAllByRole('cell')
    expect(cells.at(-1)?.textContent).toBe('—no value')
  })
})
