import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BridgeChart, type BridgeChartProps, type BridgeStep } from './BridgeChart'

const leaks: BridgeStep[] = [
  { label: 'After discount', value: -260, note: 'discount' },
  { label: 'After labor', value: -260, note: 'labor overrun' },
  { label: 'After callback', value: -240, note: 'callback' },
  { label: 'Actual profit', value: -100, note: 'materials' },
]

function renderBridge(props: Partial<BridgeChartProps> = {}) {
  return render(
    <BridgeChart
      start={{ label: 'Planned profit', value: 1260 }}
      steps={leaks}
      format="currency"
      width={700}
      title="Planned $1,260, kept $400"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, selector: string) => [...root.querySelectorAll(selector)]
const remaining = (root: HTMLElement) => parts(root, '[data-ch-part="bar"][data-ch-tone="accent"]')
const caps = (root: HTMLElement, tone = 'loss') =>
  parts(root, `[data-ch-part="bar"][data-ch-tone="${tone}"]`)
const num = (el: Element | undefined, name: string) => Number(el?.getAttribute(name))

describe('<BridgeChart>', () => {
  it('draws remaining bars with leaked caps on top', () => {
    const { container } = renderBridge()
    expect(remaining(container)).toHaveLength(5)
    expect(caps(container)).toHaveLength(4)
    expect(remaining(container).map((b) => b.getAttribute('data-ch-fill'))).toEqual([
      'hatch-fade',
      'hatch-fade',
      'hatch-fade',
      'hatch-fade',
      'solid',
    ])
    expect(caps(container).every((b) => b.getAttribute('data-ch-fill') === 'hatch')).toBe(true)
    // The first cap starts where the plan was (1260) and ends where the next column's bar begins.
    const [cap] = caps(container)
    expect(num(cap, 'y')).toBeCloseTo(num(remaining(container)[0], 'y'))
    expect(num(cap, 'y') + num(cap, 'height')).toBeCloseTo(num(remaining(container)[1], 'y'))
  })

  it('labels each column with its total and its leak', () => {
    const { container } = renderBridge()
    expect(parts(container, '[data-ch-part="column-total"]').map((t) => t.textContent)).toEqual([
      '$1,260',
      '$1,000',
      '$740',
      '$500',
      '$400',
    ])
    const notes = parts(container, '[data-ch-part="column-note"]')
    expect(notes.map((t) => t.textContent)).toEqual([
      '−$260 discount',
      '−$260 labor overrun',
      '−$240 callback',
      '−$100 materials',
    ])
    expect(notes.every((t) => t.getAttribute('data-ch-tone') === 'loss')).toBe(true)
  })

  it('joins the column totals with an area in the gaps between columns', () => {
    const { container } = renderBridge()
    const d = container.querySelector('[data-ch-part="area"]')?.getAttribute('d') ?? ''
    // One piece per gap between the 5 columns, none drawn under a column.
    const pieces = d.split('Z').filter(Boolean)
    expect(pieces).toHaveLength(4)
    const firstBar = remaining(container)[0]
    const firstX = Number(pieces[0]?.match(/^M([\d.]+)/)?.[1])
    expect(firstX).toBeCloseTo(num(firstBar, 'x') + num(firstBar, 'width'))
  })

  it('leaves the area out on request', () => {
    const { container } = renderBridge({ area: false })
    expect(container.querySelector('[data-ch-part="area"]')).toBeNull()
  })

  it('highlights the last column and its axis label', () => {
    const { container, unmount } = renderBridge()
    expect(parts(container, '[data-ch-part="column-highlight"]')).toHaveLength(1)
    const labels = parts(container, '[data-ch-part="axis-label"]')
    expect(labels.map((t) => t.textContent)).toEqual([
      'Planned profit',
      'After discount',
      'After labor',
      'After callback',
      'Actual profit',
    ])
    expect(labels.map((t) => t.getAttribute('data-ch-active'))).toEqual([
      null,
      null,
      null,
      null,
      'true',
    ])
    unmount()
    const plain = renderBridge({ highlightLast: false })
    expect(parts(plain.container, '[data-ch-part="column-highlight"]')).toHaveLength(0)
    expect(remaining(plain.container).at(-1)).toHaveAttribute('data-ch-fill', 'hatch-fade')
  })

  it('pins the callout above the last column and hides it on hover', () => {
    const { container } = renderBridge({
      callout: [
        { value: '$400', label: 'kept' },
        { value: '12.3%', label: 'margin' },
      ],
    })
    const callout = () => container.querySelector('[data-ch-part="callout"]')
    expect(callout()).toHaveTextContent('$400kept')
    fireEvent.pointerEnter(parts(container, '[data-ch-part="bar-hit"]')[1] as Element)
    expect(callout()).toBeNull()
  })

  it('lifts the callout clear of the totals and notes of the columns it spans', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const pill = this.dataset.chPart === 'callout'
      return { width: pill ? 300 : 0, height: pill ? 30 : 0 } as DOMRect
    })
    const { container } = renderBridge({
      callout: [
        { value: '$400', label: 'kept' },
        { value: '12.3%', label: 'margin' },
      ],
    })
    const pill = container.querySelector('[data-ch-part="callout"]') as HTMLElement
    const bottom = Number.parseFloat(pill.style.top) + 30
    // The 300px pill pinned over the last column also spans the "After callback" column.
    const totals = parts(container, '[data-ch-part="column-total"]')
    for (const total of totals.slice(-2)) {
      // A 22px total reaches about 18px above its baseline.
      expect(bottom).toBeLessThanOrEqual(num(total, 'y') - 18)
    }
  })

  it('tones a gain cap and keeps the remaining bar at the lower total', () => {
    const { container } = renderBridge({ steps: [{ label: 'Bonus', value: 100, note: 'bonus' }] })
    expect(caps(container, 'gain')).toHaveLength(1)
    expect(num(remaining(container)[1], 'y')).toBeCloseTo(num(remaining(container)[0], 'y'))
  })

  it('skips a missing step without breaking the total', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderBridge({
      steps: [
        { label: 'After discount', value: -260, note: 'discount' },
        { label: 'Unknown', value: Number.NaN },
        { label: 'Actual profit', value: -100, note: 'materials' },
      ],
    })
    expect(caps(container)).toHaveLength(2)
    expect(parts(container, '[data-ch-part="column-total"]').map((t) => t.textContent)).toEqual([
      '$1,260',
      '$1,000',
      '$1,000',
      '$900',
    ])
    expect(parts(container, '[data-ch-part="column-note"]')).toHaveLength(2)
    expect(container.textContent).not.toContain('NaN')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('index 1')
  })

  it('renders the empty slot when the start value is missing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderBridge({ start: { label: 'Planned profit', value: Number.NaN } })
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('keeps geometry right when the total goes below zero', () => {
    const { container } = renderBridge({
      start: { label: 'Plan', value: 100 },
      steps: [{ label: 'Loss', value: -150 }],
    })
    const [, below] = remaining(container)
    expect(below).toHaveAttribute('data-ch-dir', 'down')
    const [cap] = caps(container)
    expect(num(cap, 'height')).toBeGreaterThan(num(below, 'height'))
    for (const rect of parts(container, 'rect')) {
      for (const name of ['x', 'y', 'width', 'height']) {
        const value = rect.getAttribute(name)
        if (value !== null) expect(Number.isFinite(Number(value))).toBe(true)
      }
    }
  })

  it('draws a single column without steps', () => {
    const { container } = renderBridge({ steps: [] })
    expect(remaining(container)).toHaveLength(1)
    expect(remaining(container)[0]).toHaveAttribute('data-ch-fill', 'solid')
    expect(caps(container)).toHaveLength(0)
    expect(parts(container, '[data-ch-part="column-highlight"]')).toHaveLength(1)
    expect(container.querySelector('[data-ch-part="area"]')).toBeNull()
  })

  it('announces totals and reports the step to onSelect', () => {
    const onSelect = vi.fn()
    const { container } = renderBridge({ onSelect })
    const figure = screen.getByRole('figure', { name: 'Planned $1,260, kept $400' })
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(container.querySelector('[aria-live]')).toHaveTextContent(
      'After discount, $1,000, −$260 discount',
    )
    fireEvent.click(parts(container, '[data-ch-part="bar-hit"]')[1] as Element)
    expect(onSelect).toHaveBeenCalledWith(0, expect.objectContaining({ datum: leaks[0] }))
  })

  it('renders a hidden data table', () => {
    renderBridge()
    const table = screen.getByRole('table', { name: 'Planned $1,260, kept $400' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Column', 'Change', 'Total'])
    expect(within(table).getByText('−$100 materials')).toBeInTheDocument()
  })

  it('keeps geometry finite at zero width', () => {
    const { container } = renderBridge({ width: 0 })
    for (const rect of parts(container, 'rect')) {
      for (const name of ['x', 'y', 'width', 'height']) {
        const value = rect.getAttribute(name)
        if (value !== null) expect(Number.isFinite(Number(value))).toBe(true)
      }
    }
  })
})
