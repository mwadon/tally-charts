import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart } from '../Chart'
import { Connector, type ConnectorProps } from './Connector'

const frame = { margin: { top: 0, right: 0, bottom: 0, left: 0 }, animate: false }
const lines = (root: HTMLElement) => [...root.querySelectorAll('[data-ch-part="connector"]')]

function rows(props: ConnectorProps) {
  // Bands a, b, c on y: 30px each. Linear x: 0–100 over 200px.
  return render(
    <Chart
      title="Test chart"
      {...frame}
      width={200}
      height={90}
      x={{ domain: [0, 100] }}
      y={{ type: 'band', domain: ['a', 'b', 'c'], padding: 0 }}
    >
      <Connector {...props} />
    </Chart>,
  )
}

describe('<Connector>', () => {
  it('draws a vertical line between two rows at a value', () => {
    const { container } = rows({ links: [{ at: 50, from: 'a', to: 'b' }] })
    const [line] = lines(container)
    expect(line).toHaveAttribute('x1', '100')
    expect(line).toHaveAttribute('x2', '100')
    expect(line).toHaveAttribute('y1', '30')
    expect(line).toHaveAttribute('y2', '30')
  })

  it('pulls the ends in by the insets', () => {
    const { container } = rows({
      links: [{ at: 50, from: 'a', to: 'b' }],
      fromInset: 4,
      toInset: 12,
    })
    expect(lines(container)[0]).toHaveAttribute('y1', '26')
    expect(lines(container)[0]).toHaveAttribute('y2', '42')
  })

  it('clamps values outside the domain and skips unknown bands or bad values', () => {
    const { container } = rows({
      links: [
        { at: 150, from: 'b', to: 'c' },
        { at: 10, from: 'a', to: 'zzz' },
        { at: Number.NaN, from: 'a', to: 'b' },
      ],
    })
    expect(lines(container)).toHaveLength(1)
    expect(lines(container)[0]).toHaveAttribute('x1', '200')
  })

  it('draws a horizontal line between columns when the band is on x', () => {
    const { container } = render(
      <Chart
        title="Test chart"
        {...frame}
        width={300}
        height={100}
        x={{ type: 'band', domain: ['a', 'b', 'c'], padding: 0 }}
        y={{ domain: [0, 100] }}
      >
        <Connector links={[{ at: 50, from: 'a', to: 'c' }]} />
      </Chart>,
    )
    const [line] = lines(container)
    expect(line).toHaveAttribute('x1', '100')
    expect(line).toHaveAttribute('x2', '200')
    expect(line).toHaveAttribute('y1', '50')
  })

  it('warns and draws nothing without a band scale', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <Chart
        title="Test chart"
        {...frame}
        width={100}
        height={100}
        x={{ domain: [0, 1] }}
        y={{ domain: [0, 1] }}
      >
        <Connector links={[{ at: 0.5, from: 'a', to: 'b' }]} />
      </Chart>,
    )
    expect(lines(container)).toHaveLength(0)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Connector needs'))
  })
})
