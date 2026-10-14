import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WaterfallChart, type WaterfallChartProps, type WaterfallStep } from './WaterfallChart'

const steps: WaterfallStep[] = [
  { label: 'A', value: -20 },
  { label: 'B', value: -10 },
  { label: 'C', value: 5 },
]

// Totals 100 → 80 → 70 → 75. Domain [70, 100] over 300px: 10px per unit.
// 5 rows × 64px + 28px axis = 348px tall; each row band is 64px, bars are 18px at its bottom.
function renderWaterfall(props: Partial<WaterfallChartProps> = {}) {
  return render(
    <WaterfallChart
      start={{ label: 'Target', value: 100 }}
      steps={steps}
      end={{ label: 'Actual' }}
      width={300}
      title="Why it is under target"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, selector: string) => [...root.querySelectorAll(selector)]
const bars = (root: HTMLElement) => parts(root, '[data-ch-part="bar"]')
const column = (root: HTMLElement, side: 'left' | 'right') =>
  parts(root, `[data-ch-part="row-labels"][data-ch-side="${side}"] [data-ch-part="row-label"]`)

describe('<WaterfallChart>', () => {
  it('draws the start, each step and the computed end', () => {
    const { container } = renderWaterfall()
    const [first, a, , c, last] = bars(container)
    expect(bars(container)).toHaveLength(5)
    expect(first).toHaveAttribute('x', '0')
    expect(first).toHaveAttribute('width', '300')
    expect(first).toHaveAttribute('data-ch-tone', 'neutral')
    expect(first).toHaveAttribute('data-ch-fill', 'hatch')
    expect(first).toHaveAttribute('y', '46')
    expect(first).toHaveAttribute('height', '18')
    expect(a).toHaveAttribute('x', '100')
    expect(a).toHaveAttribute('width', '200')
    expect(a).toHaveAttribute('data-ch-tone', 'loss')
    expect(a).toHaveAttribute('data-ch-dir', 'left')
    expect(c).toHaveAttribute('x', '0')
    expect(c).toHaveAttribute('width', '50')
    expect(c).toHaveAttribute('data-ch-tone', 'gain')
    expect(last).toHaveAttribute('width', '50')
    expect(last).toHaveAttribute('data-ch-tone', 'accent')
    expect(last).toHaveAttribute('data-ch-fill', 'solid')
  })

  it('labels each row above its bar and tones step values', () => {
    const { container } = renderWaterfall()
    expect(column(container, 'left').map((t) => t.textContent)).toEqual([
      'Target',
      'A',
      'B',
      'C',
      'Actual',
    ])
    expect(column(container, 'left')[1]).toHaveAttribute('y', '64')
    expect(column(container, 'left')[1]).toHaveAttribute('dominant-baseline', 'hanging')
    const right = column(container, 'right')
    expect(right.map((t) => t.textContent)).toEqual(['100', '−20', '−10', '+5', '75'])
    expect(right.map((t) => t.getAttribute('data-ch-tone'))).toEqual([
      null,
      'loss',
      'loss',
      'gain',
      null,
    ])
  })

  it('uses stepLabel for step text and "Total" as the default end label', () => {
    const { container } = renderWaterfall({ stepLabel: (s) => `${s.label} step`, end: undefined })
    expect(column(container, 'right')[1]).toHaveTextContent('A step')
    expect(column(container, 'left').at(-1)).toHaveTextContent('Total')
  })

  it('connects each bar to the next at the running total', () => {
    const { container } = renderWaterfall()
    const lines = parts(container, '[data-ch-part="connector"]')
    expect(lines).toHaveLength(4)
    expect(lines[0]).toHaveAttribute('x1', '300')
    expect(lines[0]).toHaveAttribute('y1', '64')
    expect(lines[0]).toHaveAttribute('y2', '110')
    expect(lines[1]).toHaveAttribute('x1', '100')
    expect(lines[3]).toHaveAttribute('x1', '50')
    expect(lines[3]).toHaveAttribute('y2', '302')
  })

  it('skips a missing step without breaking the total', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderWaterfall({
      steps: [
        { label: 'A', value: -20 },
        { label: 'B', value: Number.NaN },
        { label: 'C', value: -10 },
      ],
    })
    expect(bars(container)).toHaveLength(4)
    expect(column(container, 'left').map((t) => t.textContent)).toContain('B')
    expect(column(container, 'right').map((t) => t.textContent)).toEqual([
      '100',
      '−20',
      '−10',
      '70',
    ])
    expect(parts(container, '[data-ch-part="connector"]')).toHaveLength(3)
    expect(container.textContent).not.toContain('NaN')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('index 1')
  })

  it('renders the empty slot when the start value is missing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderWaterfall({ start: { label: 'Target', value: Number.NaN } })
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('handles a chart with no steps', () => {
    const { container } = renderWaterfall({ steps: [] })
    const [first, last] = bars(container)
    expect(bars(container)).toHaveLength(2)
    expect(first?.getAttribute('width')).toBe(last?.getAttribute('width'))
    expect(Number(first?.getAttribute('width'))).toBeGreaterThan(0)
    expect(parts(container, '[data-ch-part="connector"]')).toHaveLength(1)
  })

  it('announces running totals and reports the step to onSelect', () => {
    const onSelect = vi.fn()
    const { container } = renderWaterfall({
      onSelect,
      steps: [{ label: 'A', value: -20, id: 'labor' }, ...steps.slice(1)],
    })
    const figure = screen.getByRole('figure', { name: 'Why it is under target' })
    fireEvent.keyDown(figure, { key: 'ArrowDown' })
    fireEvent.keyDown(figure, { key: 'ArrowDown' })
    expect(container.querySelector('[aria-live]')).toHaveTextContent('A, −20, running total 80')
    fireEvent.click(parts(container, '[data-ch-part="bar-hit"]')[2] as Element)
    expect(onSelect).toHaveBeenCalledWith(1, expect.objectContaining({ datum: steps[1] }))
    fireEvent.click(parts(container, '[data-ch-part="bar-hit"]')[1] as Element)
    expect(onSelect.mock.calls[1]?.[0]).toBe('labor')
  })

  it('renders a hidden data table', () => {
    renderWaterfall()
    const table = screen.getByRole('table', { name: 'Why it is under target' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Item', 'Change', 'Total'])
    expect(within(table).getAllByRole('row')).toHaveLength(6)
    expect(within(table).getByText('−20')).toBeInTheDocument()
    expect(within(table).getByText('80')).toBeInTheDocument()
  })

  it('keeps geometry finite at zero width', () => {
    const { container } = renderWaterfall({ width: 0 })
    for (const el of [...parts(container, 'rect'), ...parts(container, 'line')]) {
      for (const name of ['x', 'y', 'width', 'height', 'x1', 'x2', 'y1', 'y2']) {
        const value = el.getAttribute(name)
        if (value !== null) expect(Number.isFinite(Number(value))).toBe(true)
      }
    }
  })
})
