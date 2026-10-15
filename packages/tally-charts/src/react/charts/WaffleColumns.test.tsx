import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WaffleColumns, type WaffleColumnsProps } from './WaffleColumns'

type Week = { week: string; leaked: number | null; month: string }
const weeks: Week[] = [
  { week: 'Aug 3', leaked: 8, month: 'August' },
  { week: 'Aug 10', leaked: 12, month: 'August' },
  { week: 'Sep 7', leaked: 24, month: 'September' },
  { week: 'Sep 14', leaked: 10, month: 'September' },
]

// unit 2 → 4, 6, 12 and 5 dots; 2 across → the tallest column has 6 rows.
// 400 × 200 with a 44px top (room for the peak pill) and 28px bottom: 128px of plot height,
// cells of 128/6 px.
function renderWaffle(props: Partial<WaffleColumnsProps<Week>> = {}) {
  return render(
    <WaffleColumns<Week>
      data={weeks}
      x="week"
      y="leaked"
      group="month"
      unit={2}
      width={400}
      height={200}
      title="Profit leaked"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, selector: string) => [...root.querySelectorAll(selector)]
const dots = (root: HTMLElement) => parts(root, '[data-ch-part="dot"]')
const peakDots = (root: HTMLElement) =>
  dots(root).filter(
    (d) => d.getAttribute('data-ch-tone') === 'loss' && !d.hasAttribute('data-ch-soft'),
  )

describe('<WaffleColumns>', () => {
  it('draws a column of dots per period, bottom-up', () => {
    const { container } = renderWaffle()
    expect(dots(container)).toHaveLength(27)
    const bottom = Math.max(...dots(container).map((d) => Number(d.getAttribute('cy'))))
    expect(bottom).toBeCloseTo(128 - 128 / 6 / 2)
  })

  it('tones groups and makes the peak solid', () => {
    const { container } = renderWaffle()
    const august = dots(container).filter((d) => d.getAttribute('data-ch-tone') === 'neutral')
    expect(august).toHaveLength(10)
    expect(august.every((d) => d.getAttribute('data-ch-soft') === 'true')).toBe(true)
    expect(peakDots(container)).toHaveLength(12)
  })

  it('labels each group under its columns', () => {
    const { container } = renderWaffle()
    const labels = parts(container, '[data-ch-part="group-label"]')
    expect(labels.map((t) => t.textContent)).toEqual(['August', 'September'])
    expect(labels[1]).toHaveAttribute('data-ch-tone', 'loss')
  })

  it('pins the peak callout', () => {
    const { container } = renderWaffle()
    const callout = container.querySelector('[data-ch-part="callout"]')
    expect(callout).toHaveTextContent('Peak')
    expect(callout).toHaveTextContent('Sep 7')
    expect(callout).toHaveTextContent('24')
  })

  it('leaves room above the plot for the peak pill, and none without it', () => {
    const plotTop = (root: HTMLElement) =>
      root.querySelector('svg > g')?.getAttribute('transform') ?? ''
    const { container, unmount } = renderWaffle()
    expect(plotTop(container)).toBe('translate(0,44)')
    unmount()
    const without = renderWaffle({ callout: false })
    expect(plotTop(without.container)).toBe('translate(0,8)')
  })

  it('activates a whole column from anywhere above it', () => {
    const onActiveChange = vi.fn()
    const { container } = renderWaffle({ onActiveChange })
    const xs = peakDots(container).map((d) => Number(d.getAttribute('cx')))
    const center = (Math.min(...xs) + Math.max(...xs)) / 2
    const layer = container.querySelector('[data-ch-part="pointer-layer"]') as Element
    fireEvent.pointerMove(layer, { clientX: center, clientY: 2 })
    expect(onActiveChange).toHaveBeenLastCalledWith(2, expect.objectContaining({ datum: weeks[2] }))
    expect(peakDots(container).some((d) => d.hasAttribute('data-ch-dimmed'))).toBe(false)
    expect(dots(container).filter((d) => d.hasAttribute('data-ch-dimmed'))).toHaveLength(15)
  })

  it('moves column to column with the keyboard', () => {
    const { container } = renderWaffle()
    const chart = screen.getByRole('application', { name: 'Profit leaked' })
    for (let i = 0; i < 3; i++) fireEvent.keyDown(chart, { key: 'ArrowRight' })
    expect(container.querySelector('[aria-live]')?.textContent).toBe('3 of 4, Sep 7, 24')
  })

  it('draws an empty column for a missing value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderWaffle({
      data: weeks.map((w) => (w.week === 'Aug 10' ? { ...w, leaked: null } : w)),
    })
    expect(dots(container)).toHaveLength(21)
    expect(container.textContent).not.toContain('NaN')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('WaffleColumns skipped')
  })

  it('picks a unit when none is given', () => {
    const { container } = renderWaffle({ unit: undefined })
    expect(dots(container)).toHaveLength(27)
  })

  it('keeps every column solid when peak is off', () => {
    const { container } = renderWaffle({ peak: false, callout: false })
    expect(dots(container).some((d) => d.hasAttribute('data-ch-soft'))).toBe(false)
    expect(container.querySelector('[data-ch-part="callout"]')).toBeNull()
  })

  it('falls back to index ids on duplicate ids, keeping every column reachable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderWaffle({ id: 'month' })
    const chart = screen.getByRole('application', { name: 'Profit leaked' })
    const seen = new Set<string>()
    for (let i = 0; i < 4; i++) {
      fireEvent.keyDown(chart, { key: 'ArrowRight' })
      seen.add(container.querySelector('[aria-live]')?.textContent ?? '')
    }
    expect([...seen]).toEqual([
      '1 of 4, Aug 3, 8',
      '2 of 4, Aug 10, 12',
      '3 of 4, Sep 7, 24',
      '4 of 4, Sep 14, 10',
    ])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('duplicate id')
  })

  it('caps an outlier column at the dots that fit and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderWaffle({
      data: weeks.map((w) => (w.week === 'Sep 7' ? { ...w, leaked: 1000 } : w)),
    })
    // 128px of plot height fits floor(128 / (2 × 1.5 + 3)) = 21 rows: 42 dots two across.
    expect(dots(container)).toHaveLength(4 + 6 + 42 + 5)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('columns are capped at 42 dots')
    for (const el of dots(container)) {
      for (const name of ['cx', 'cy', 'r']) {
        expect(Number.isFinite(Number(el.getAttribute(name)))).toBe(true)
      }
      expect(Number(el.getAttribute('r'))).toBeGreaterThanOrEqual(1.5)
      expect(Number(el.getAttribute('cy'))).toBeGreaterThanOrEqual(0)
    }
  })

  it('rounds a fractional width down', () => {
    const geometry = (root: HTMLElement) =>
      dots(root).map((d) => ['cx', 'cy', 'r'].map((name) => d.getAttribute(name)))
    const two = renderWaffle({ wide: 2 })
    const expected = geometry(two.container)
    two.unmount()
    expect(geometry(renderWaffle({ wide: 2.5 }).container)).toEqual(expected)
  })

  it('renders a hidden data table', () => {
    renderWaffle()
    const table = screen.getByRole('table', { name: 'Profit leaked' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Week', 'Leaked', 'Month'])
  })

  it('keeps geometry finite at zero width', () => {
    const { container } = renderWaffle({ width: 0 })
    for (const el of parts(container, 'circle, rect')) {
      for (const name of ['cx', 'cy', 'r', 'x', 'y', 'width', 'height']) {
        const value = el.getAttribute(name)
        if (value !== null) expect(Number.isFinite(Number(value))).toBe(true)
      }
    }
  })
})
