import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { thresholds } from '../../core/thresholds'
import { DotHistogram, type DotHistogramProps } from './DotHistogram'

type Job = { id: number; margin: number | null }
const jobs: Job[] = [
  { id: 1, margin: 3 },
  { id: 2, margin: 12.3 },
  { id: 3, margin: 12.8 },
  { id: 4, margin: 30 },
  { id: 5, margin: 45 },
  { id: 6, margin: 45.5 },
]
const th = thresholds(
  [10, 25, 38],
  ['loss', 'warn', 'accent-soft', 'gain'],
  ['Critical', 'At risk', 'Below target', 'On target'],
)

// 600px wide, 8px side margins: 584px for 0–60%, 1% bins about 9.7px wide.
function renderHistogram(props: Partial<DotHistogramProps<Job>> = {}) {
  return render(
    <DotHistogram<Job>
      data={jobs}
      value="margin"
      id="id"
      label={(d) => `#${d.id}`}
      format="percent"
      toneBy={th}
      domain={[0, 60]}
      width={600}
      title="Jobs by margin"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, selector: string) => [...root.querySelectorAll(selector)]
const dots = (root: HTMLElement) => parts(root, '[data-ch-part="dot"]')

describe('<DotHistogram>', () => {
  it('draws one dot per item, toned by thresholds', () => {
    const { container } = renderHistogram()
    expect(dots(container).map((d) => d.getAttribute('data-ch-tone'))).toEqual([
      'loss',
      'warn',
      'warn',
      'accent-soft',
      'gain',
      'gain',
    ])
  })

  it('stacks values that share a bin', () => {
    const { container } = renderHistogram()
    const [, low, high] = dots(container)
    expect(low?.getAttribute('cx')).toBe(high?.getAttribute('cx'))
    expect(Number(high?.getAttribute('cy'))).toBeLessThan(Number(low?.getAttribute('cy')))
  })

  it('draws the target and the value axis', () => {
    const { container } = renderHistogram({ target: { value: 38, label: 'Target 38%' } })
    expect(container.querySelector('[data-ch-part="target-label"]')).toHaveTextContent('Target 38%')
    const labels = parts(container, '[data-ch-part="axis-label"]').map((t) => t.textContent)
    expect(labels[0]).toBe('0.0%')
    expect(labels.at(-1)).toBe('60.0%')
  })

  it('pins a callout with a stem to an item', () => {
    const { container } = renderHistogram({ calloutId: 2 })
    const callout = container.querySelector('[data-ch-part="callout"]')
    expect(callout).toHaveTextContent('#2')
    expect(callout).toHaveTextContent('12.3%')
    expect(container.querySelector('[data-ch-part="callout-stem"]')).not.toBeNull()
  })

  it('lifts the callout clear of the taller stacks it spans', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const pill = this.dataset.chPart === 'callout'
      return { width: pill ? 300 : 0, height: pill ? 30 : 0 } as DOMRect
    })
    // Five jobs at 15% stack higher than #2's own two-dot stack, under the 300px pill.
    const tall: Job[] = [21, 22, 23, 24, 25].map((n) => ({ id: n, margin: 15.2 }))
    const { container } = renderHistogram({ data: [...jobs, ...tall], calloutId: 2 })
    const pill = container.querySelector('[data-ch-part="callout"]') as HTMLElement
    const bottom = Number.parseFloat(pill.style.top) + 30
    const top = Math.min(
      ...dots(container).map((d) => Number(d.getAttribute('cy')) - Number(d.getAttribute('r'))),
    )
    expect(bottom).toBeLessThan(top)
  })

  it('activates the nearest dot on hover and reports the user datum', () => {
    const onActiveChange = vi.fn()
    const { container } = renderHistogram({ onActiveChange })
    const [, dot] = dots(container)
    const layer = container.querySelector('[data-ch-part="pointer-layer"]') as Element
    fireEvent.pointerMove(layer, {
      clientX: Number(dot?.getAttribute('cx')),
      clientY: Number(dot?.getAttribute('cy')),
    })
    expect(onActiveChange).toHaveBeenLastCalledWith(2, expect.objectContaining({ datum: jobs[1] }))
  })

  it('moves across bins and up stacks with the arrow keys', () => {
    const { container } = renderHistogram()
    const figure = screen.getByRole('figure', { name: 'Jobs by margin' })
    const live = () => container.querySelector('[aria-live]')?.textContent
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(live()).toBe('#1, 3.0%')
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(live()).toBe('#2, 12.3%')
    fireEvent.keyDown(figure, { key: 'ArrowUp' })
    expect(live()).toBe('#3, 12.8%')
  })

  it('skips missing values without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderHistogram({
      data: [...jobs, { id: 7, margin: null }, { id: 8, margin: '' as unknown as number }],
    })
    expect(dots(container)).toHaveLength(6)
    expect(container.textContent).not.toContain('NaN')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('DotHistogram skipped')
  })

  it("warns once when the dots don't fit", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const many = Array.from({ length: 300 }, (_, i) => ({ id: i, margin: 10 }))
    const { container } = renderHistogram({ data: many, height: 120 })
    expect(dots(container)).toHaveLength(300)
    expect(dots(container)[0]).toHaveAttribute('r', '2')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('more dots than fit')
  })

  it('renders a hidden data table with the threshold group', () => {
    renderHistogram()
    const table = screen.getByRole('table', { name: 'Jobs by margin' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Item', 'margin', 'Group'])
    expect(within(table).getByText('#2')).toBeInTheDocument()
    expect(within(table).getAllByText('At risk')).toHaveLength(2)
  })

  it('keeps geometry finite at zero width', () => {
    const { container } = renderHistogram({ width: 0 })
    for (const el of parts(container, 'circle, rect, line')) {
      for (const name of ['cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'x1', 'x2', 'y1', 'y2']) {
        const value = el.getAttribute(name)
        if (value !== null) expect(Number.isFinite(Number(value))).toBe(true)
      }
    }
  })
})
