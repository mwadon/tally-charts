import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart } from '../Chart'
import { Bars } from '../marks/Bars'
import { Callout, type CalloutProps } from './Callout'

const weeks = [
  { week: 'W1', margin: 10 },
  { week: 'W2', margin: 20 },
]

function renderCallout(props: CalloutProps) {
  return render(
    <Chart
      data={weeks}
      width={200}
      height={120}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      x={{ type: 'band', field: 'week', padding: 0 }}
      y={{ field: 'margin', domain: [0, 20] }}
      animate={false}
    >
      <Bars />
      <Callout {...props} />
    </Chart>,
  )
}

const callout = (root: HTMLElement) => root.querySelector('[data-ch-part="callout"]')

describe('<Callout>', () => {
  it("pins the point's own pill without hover", () => {
    const { container } = renderCallout({ id: 0 })
    expect(callout(container)).toHaveTextContent('W1')
    expect(callout(container)).toHaveTextContent('10')
    // jsdom measures 0×0: the W1 anchor is (50, 60), so the pill sits 10px above it.
    expect(callout(container)).toHaveStyle({ left: '50px', top: '50px' })
    expect(callout(container)).toHaveAttribute('data-ch-placement', 'top')
  })

  it('shows custom segments or content', () => {
    const { container, unmount } = renderCallout({ id: 1, segments: [{ value: 'Pinned' }] })
    expect(callout(container)).toHaveTextContent('Pinned')
    unmount()
    const custom = renderCallout({ id: 1, content: <b>Custom</b> })
    expect(callout(custom.container)).toHaveTextContent('Custom')
  })

  it('draws a stem from the pill to the point', () => {
    const { container } = renderCallout({ id: 0, stem: true })
    const stem = container.querySelector('[data-ch-part="callout-stem"]')
    expect(stem).toHaveStyle({ left: '50px', top: '50px', height: '10px' })
  })

  it('hides while a point is active and comes back after', () => {
    const { container } = renderCallout({ id: 0 })
    const hit = container.querySelectorAll('[data-ch-part="bar-hit"]')[1] as Element
    fireEvent.pointerEnter(hit)
    expect(callout(container)).toBeNull()
    fireEvent.pointerLeave(container.querySelector('figure') as Element)
    expect(callout(container)).not.toBeNull()
  })

  it('stays visible while active when hideWhileActive is false', () => {
    const { container } = renderCallout({ id: 0, hideWhileActive: false })
    fireEvent.pointerEnter(container.querySelectorAll('[data-ch-part="bar-hit"]')[1] as Element)
    expect(callout(container)).not.toBeNull()
  })

  it('rises until its bottom clears the line the clearance gives for its span', () => {
    const clearance = vi.fn(() => 30)
    const { container } = renderCallout({ id: 0, clearance })
    // The W1 anchor is at y 60; the pill (0×0 in jsdom) spans x 50–50 and must end above y 30.
    expect(clearance).toHaveBeenLastCalledWith(50, 50)
    expect(callout(container)).toHaveStyle({ top: '30px' })
    expect(callout(container)).toHaveAttribute('data-ch-placement', 'top')
  })

  it('keeps its offset when the clearance is already met or not finite', () => {
    const { container, unmount } = renderCallout({ id: 0, clearance: () => 55 })
    expect(callout(container)).toHaveStyle({ top: '50px' })
    unmount()
    const none = renderCallout({ id: 0, clearance: () => Number.POSITIVE_INFINITY })
    expect(callout(none.container)).toHaveStyle({ top: '50px' })
  })

  it('renders nothing for an unknown id', () => {
    const { container } = renderCallout({ id: 99 })
    expect(callout(container)).toBeNull()
  })
})
