import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Id } from '../../core/types'
import { Chart } from '../Chart'
import { Bars } from '../marks/Bars'
import { Tooltip, type TooltipProps } from './Tooltip'

type Week = { week: string; margin: number }
const three: Week[] = [
  { week: 'W1', margin: 10 },
  { week: 'W2', margin: 20 },
  { week: 'W3', margin: 15 },
]

function Example({
  data = three,
  activeId,
  tooltip,
}: {
  data?: Week[]
  activeId?: Id | null
  tooltip?: TooltipProps
}) {
  return (
    <Chart
      data={data}
      width={300}
      height={120}
      activeId={activeId}
      x={{ type: 'band', field: 'week', padding: 0 }}
      y={{ field: 'margin', domain: [0, 20] }}
    >
      <Bars format="percent" />
      <Tooltip {...tooltip} />
    </Chart>
  )
}

const tooltip = (root: HTMLElement) => root.querySelector('[data-ch-part="tooltip"]')

describe('<Tooltip>', () => {
  it('shows nothing until a point is active', () => {
    const { container } = render(<Example />)
    expect(tooltip(container)).toBeNull()
  })

  it('shows the pill for the hovered bar', () => {
    const { container } = render(<Example />)
    fireEvent.pointerEnter(container.querySelectorAll('[data-ch-part="bar-hit"]')[1] as Element)
    expect(tooltip(container)).toHaveTextContent('W2')
    expect(tooltip(container)).toHaveTextContent('20.0%')
  })

  it('shows the tooltip for keyboard focus too', () => {
    const { container } = render(<Example />)
    fireEvent.keyDown(screen.getByRole('application'), { key: 'ArrowRight' })
    expect(tooltip(container)).toHaveTextContent('W1')
  })

  it('accepts custom content', () => {
    const { container } = render(
      <Example tooltip={{ content: (p) => <span>custom {String(p.id)}</span> }} />,
    )
    fireEvent.pointerEnter(container.querySelectorAll('[data-ch-part="bar-hit"]')[0] as Element)
    expect(screen.getByText('custom 0')).toBeInTheDocument()
  })

  it('hides when the active item disappears from the data', () => {
    const { container, rerender } = render(<Example activeId={2} />)
    expect(tooltip(container)).toHaveTextContent('W3')
    rerender(<Example data={three.slice(0, 2)} activeId={2} />)
    expect(tooltip(container)).toBeNull()
  })
})
