import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ComparisonBars, type ComparisonBarsProps } from './ComparisonBars'

type Line = { name: string; note?: string; estimate: number | null; actual: number | null }
const lines: Line[] = [
  { name: 'Labor', note: '7.5 h planned', estimate: 640, actual: 1060 },
  { name: 'Subcontract', estimate: 400, actual: 400 },
  { name: 'Permit', estimate: 210, actual: 160 },
]

function renderRows(props: Partial<ComparisonBarsProps<Line>> = {}) {
  return render(
    <ComparisonBars<Line>
      data={lines}
      label="name"
      sublabel="note"
      plan="estimate"
      actual="actual"
      format="currency"
      width={600}
      title="Estimate vs actual"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, selector: string) => [...root.querySelectorAll(selector)]
const planBars = (root: HTMLElement) =>
  parts(root, '[data-ch-part="bar"][data-ch-tone="accent-soft"]')
const actualBars = (root: HTMLElement) => parts(root, '[data-ch-part="bar"][data-ch-tone="accent"]')
const overBars = (root: HTMLElement, tone = 'loss') =>
  parts(root, `[data-ch-part="bar"][data-ch-tone="${tone}"]`)
const rightColumns = (root: HTMLElement) =>
  parts(root, '[data-ch-part="row-labels"][data-ch-side="right"]').map((g) =>
    [...g.querySelectorAll('[data-ch-part="row-label"]')].map((t) => ({
      text: t.textContent,
      tone: t.getAttribute('data-ch-tone'),
    })),
  )

describe('<ComparisonBars>', () => {
  it('draws a hatched plan bar and a solid actual bar per row', () => {
    const { container } = renderRows()
    expect(planBars(container)).toHaveLength(3)
    expect(planBars(container).every((b) => b.getAttribute('data-ch-fill') === 'hatch')).toBe(true)
    expect(actualBars(container)).toHaveLength(3)
    expect(actualBars(container).every((b) => b.getAttribute('data-ch-fill') === 'solid')).toBe(
      true,
    )
  })

  it('draws the overrun as a separate segment from the plan to the actual', () => {
    const { container } = renderRows()
    const [over] = overBars(container)
    expect(overBars(container)).toHaveLength(1)
    const planWidth = Number(planBars(container)[0]?.getAttribute('width'))
    expect(Number(over?.getAttribute('x'))).toBeCloseTo(planWidth)
    // The solid actual bar stops at the plan; the overrun carries the rest.
    expect(Number(actualBars(container)[0]?.getAttribute('width'))).toBeCloseTo(planWidth)
  })

  it('writes the change column and a toned delta column', () => {
    const { container } = renderRows()
    const [change, delta] = rightColumns(container)
    expect(change?.map((c) => c.text)).toEqual(['$640 → $1,060', '$400 → $400', '$210 → $160'])
    expect(delta).toEqual([
      { text: '+$420', tone: 'loss' },
      { text: 'On plan', tone: 'neutral' },
      { text: '−$50', tone: 'gain' },
    ])
  })

  it('shows labels with sublabels on the left', () => {
    const { container } = renderRows()
    const left = parts(container, '[data-ch-part="row-labels"][data-ch-side="left"]')[0]
    expect(left).toHaveTextContent('Labor')
    expect(left?.querySelector('[data-ch-part="row-sublabel"]')).toHaveTextContent('7.5 h planned')
  })

  it('treats differences within the tolerance as on plan', () => {
    const { container } = renderRows({ tolerance: 60 })
    expect(rightColumns(container)[1]?.[2]).toEqual({ text: 'On plan', tone: 'neutral' })
  })

  it('names the on-plan text with onPlanLabel', () => {
    const { container } = renderRows({ tolerance: 60, onPlanLabel: 'As planned' })
    expect(rightColumns(container)[1]?.[2]).toEqual({ text: 'As planned', tone: 'neutral' })
  })

  it('flips tones when going over is good', () => {
    const { container } = renderRows({ good: 'up' })
    expect(overBars(container, 'gain')).toHaveLength(1)
    expect(rightColumns(container)[1]?.[0]).toEqual({ text: '+$420', tone: 'gain' })
    expect(rightColumns(container)[1]?.[2]).toEqual({ text: '−$50', tone: 'loss' })
  })

  it('visits each row once with the arrow keys', () => {
    const onActiveChange = vi.fn()
    renderRows({ onActiveChange })
    const chart = screen.getByRole('application', { name: 'Estimate vs actual' })
    for (let i = 0; i < 4; i++) fireEvent.keyDown(chart, { key: 'ArrowDown' })
    expect(onActiveChange.mock.calls.map((call) => call[0])).toEqual([0, 1, 2])
  })

  it('announces plan, actual and difference', () => {
    const { container } = renderRows()
    fireEvent.keyDown(screen.getByRole('application'), { key: 'ArrowDown' })
    expect(container.querySelector('[aria-live]')).toHaveTextContent(
      'Labor, plan $640, actual $1,060, +$420',
    )
  })

  it('selects a row by clicking anywhere on it', () => {
    const onSelect = vi.fn()
    const { container } = renderRows({ onSelect })
    const hits = parts(container, '[data-ch-part="bar-hit"]')
    expect(hits).toHaveLength(3)
    fireEvent.click(hits[2] as Element)
    expect(onSelect).toHaveBeenCalledWith(2, expect.objectContaining({ id: 2 }))
  })

  it('reports the user datum to onSelect and onActiveChange', () => {
    const onSelect = vi.fn()
    const onActiveChange = vi.fn()
    const { container } = renderRows({ onSelect, onActiveChange })
    fireEvent.click(parts(container, '[data-ch-part="bar-hit"]')[2] as Element)
    expect(onSelect.mock.calls[0]?.[1].datum).toBe(lines[2])
    fireEvent.keyDown(screen.getByRole('application'), { key: 'ArrowDown' })
    expect(onActiveChange.mock.calls[0]?.[1].datum).toBe(lines[0])
  })

  it('shows the label but no values for a row with a missing actual', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderRows({
      data: [...lines.slice(0, 2), { name: 'Permit', estimate: 210, actual: null }],
    })
    expect(container.textContent).toContain('Permit')
    expect(container.textContent).not.toContain('NaN')
    const [change, delta] = rightColumns(container)
    expect(change).toHaveLength(2)
    expect(delta).toHaveLength(2)
    expect(actualBars(container)).toHaveLength(2)
    expect(planBars(container)).toHaveLength(3)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('ComparisonBars')
  })

  it('renders a hidden data table', () => {
    renderRows()
    const table = screen.getByRole('table', { name: 'Estimate vs actual' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Name', 'Estimate', 'Actual', 'Difference'])
    expect(within(table).getByText('+$420')).toBeInTheDocument()
  })

  it('stacks the text over full-width bars when the bars would get less than 120px', () => {
    // 400 − 240 − 220 leaves no room for the bars: 'auto' stacks.
    const { container } = renderRows({ width: 400 })
    // No label or value columns: the plot is the full width.
    expect(container.querySelector('svg > g')).toHaveAttribute('transform', 'translate(0,0)')
    expect(Number(planBars(container)[0]?.getAttribute('x'))).toBe(0)
    // Rows grow by two text lines: 3 × (56 + 26 + 18).
    expect(container.querySelector('svg')).toHaveAttribute('height', '300')
    const labels = parts(container, '[data-ch-part="row-label"]')
    const first = labels.find((t) => t.textContent === 'Labor')
    const delta = labels.find((t) => t.textContent === '+$420')
    // The label and the delta share the first line, at the left and right edges.
    expect(first?.getAttribute('y')).toBe(delta?.getAttribute('y'))
    expect(first).toHaveAttribute('x', '0')
    expect(delta).toHaveAttribute('x', '400')
    // The change sits under the delta, on the sublabel's line.
    const change = parts(container, '[data-ch-part="row-sublabel"]').find(
      (t) => t.textContent === '$640 → $1,060',
    )
    expect(change).toHaveAttribute('text-anchor', 'end')
    expect(Number(change?.getAttribute('y'))).toBeGreaterThan(Number(first?.getAttribute('y')))
    // The bars sit under the text, in the lower part of the row.
    const bar = actualBars(container)[0] as Element
    expect(Number(bar.getAttribute('y'))).toBeGreaterThan(Number(change?.getAttribute('y')))
  })

  it('cuts a long label in the stacked layout to the room the values leave', () => {
    const long = [{ name: 'Permit and disposal fees', estimate: 210, actual: 160 }]
    const { container } = renderRows({ data: long, sublabel: undefined, width: 200 })
    const label = parts(container, '[data-ch-part="row-label"]')[0]
    expect(label?.textContent).toMatch(/…$/)
  })

  it('stacks rows with one text line when there are no values and no sublabels', () => {
    const { container } = renderRows({ width: 200, showValues: false, sublabel: undefined })
    // 3 × (56 + 26): one line of text above the bars.
    expect(container.querySelector('svg')).toHaveAttribute('height', '246')
    expect(parts(container, '[data-ch-part="row-labels"][data-ch-side="right"]')).toHaveLength(0)
    // With no values the label gets the whole line: "Subcontract" is not cut at 200px.
    expect(parts(container, '[data-ch-part="row-label"]').map((t) => t.textContent)).toEqual([
      'Labor',
      'Subcontract',
      'Permit',
    ])
    for (const bar of parts(container, '[data-ch-part="bar"]')) {
      expect(Number.isFinite(Number(bar.getAttribute('y')))).toBe(true)
    }
  })

  it('honours layout="columns" on a narrow chart and layout="stacked" on a wide one', () => {
    const narrow = renderRows({ width: 400, layout: 'columns' })
    expect(narrow.container.querySelector('svg > g')).toHaveAttribute(
      'transform',
      'translate(240,0)',
    )
    for (const bar of parts(narrow.container, '[data-ch-part="bar"]')) {
      expect(Number.isFinite(Number(bar.getAttribute('width')))).toBe(true)
    }
    narrow.unmount()
    const wide = renderRows({ width: 600, layout: 'stacked' })
    expect(wide.container.querySelector('svg > g')).toHaveAttribute('transform', 'translate(0,0)')
  })

  it('sizes the chart from the row count', () => {
    const { container } = renderRows()
    expect(container.querySelector('svg')).toHaveAttribute('height', '168')
  })

  it('keeps geometry finite at zero width', () => {
    const { container } = renderRows({ width: 0 })
    for (const rect of parts(container, 'rect')) {
      for (const name of ['x', 'y', 'width', 'height']) {
        const value = rect.getAttribute(name)
        if (value !== null) expect(Number.isFinite(Number(value))).toBe(true)
      }
      expect(Number(rect.getAttribute('width') ?? 0)).toBeGreaterThanOrEqual(0)
    }
  })
})
