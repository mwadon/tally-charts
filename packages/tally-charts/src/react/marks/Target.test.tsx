import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart } from '../Chart'
import { Target } from './Target'

const frame = {
  width: 200,
  height: 100,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  animate: false,
}

describe('<Target>', () => {
  it('draws a dashed rule across the plot at a y value with an end label', () => {
    const { container } = render(
      <Chart {...frame} x={{ domain: [0, 1] }} y={{ domain: [0, 40] }}>
        <Target y={30} label="Target 38%" />
      </Chart>,
    )
    const line = container.querySelector('[data-ch-part="target"]')
    expect(line).toHaveAttribute('x1', '0')
    expect(line).toHaveAttribute('x2', '200')
    expect(line).toHaveAttribute('y1', '25')
    expect(line).toHaveAttribute('data-ch-variant', 'line')
    const label = container.querySelector('[data-ch-part="target-label"]')
    expect(label).toHaveTextContent('Target 38%')
    expect(label).toHaveAttribute('text-anchor', 'end')
    expect(label).toHaveAttribute('x', '200')
    expect(label).toHaveAttribute('y', '19')
  })

  it('draws a vertical rule for an x value', () => {
    const { container } = render(
      <Chart {...frame} x={{ domain: [0, 60] }} y={{ domain: [0, 1] }}>
        <Target x={30} label="Target 38%" />
      </Chart>,
    )
    const line = container.querySelector('[data-ch-part="target"]')
    expect(line).toHaveAttribute('x1', '100')
    expect(line).toHaveAttribute('y2', '100')
    expect(container.querySelector('[data-ch-part="target-label"]')).toHaveAttribute('x', '106')
  })

  it('draws a short tick for the tick variant', () => {
    const { container } = render(
      <Chart {...frame} x={{ domain: [0, 40] }} y={{ domain: [0, 1] }}>
        <Target x={20} variant="tick" tickLength={20} />
      </Chart>,
    )
    const line = container.querySelector('[data-ch-part="target"]')
    expect(line).toHaveAttribute('y1', '40')
    expect(line).toHaveAttribute('y2', '60')
  })

  it('warns and draws nothing on a band axis', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <Chart {...frame} x={{ type: 'band', domain: ['a'] }} y={{ domain: [0, 1] }}>
        <Target x={1} />
      </Chart>,
    )
    expect(container.querySelector('[data-ch-part="target"]')).toBeNull()
    expect(String(warn.mock.calls[0]?.[0])).toContain('linear scale')
  })
})
