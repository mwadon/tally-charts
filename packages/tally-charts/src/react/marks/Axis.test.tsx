import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Chart } from '../Chart'
import { Axis } from './Axis'

const frame = { height: 100, margin: { top: 0, right: 0, bottom: 0, left: 0 }, animate: false }
const labels = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-ch-part="axis-label"]')].map((el) => el.textContent)

describe('<Axis>', () => {
  it('labels the band ends with outer anchors below the plot', () => {
    const { container } = render(
      <Chart
        {...frame}
        width={300}
        x={{ type: 'band', domain: ['W1', 'W2', 'W3'], padding: 0 }}
        y={{ domain: [0, 1] }}
      >
        <Axis side="bottom" ticks="ends" />
      </Chart>,
    )
    expect(labels(container)).toEqual(['W1', 'W3'])
    const [first, last] = container.querySelectorAll('[data-ch-part="axis-label"]')
    expect(first).toHaveAttribute('text-anchor', 'start')
    expect(first).toHaveAttribute('x', '0')
    expect(first).toHaveAttribute('y', '108')
    expect(last).toHaveAttribute('text-anchor', 'end')
    expect(last).toHaveAttribute('x', '300')
  })

  it('puts band end labels on a side axis level with their rows', () => {
    const { container } = render(
      <Chart
        {...frame}
        width={300}
        x={{ domain: [0, 1] }}
        y={{ type: 'band', domain: ['W1', 'W2', 'W3', 'W4'], padding: 0 }}
      >
        <Axis side="left" ticks="ends" />
      </Chart>,
    )
    expect(labels(container)).toEqual(['W1', 'W4'])
    const [first, last] = container.querySelectorAll('[data-ch-part="axis-label"]')
    expect(first).toHaveAttribute('y', '12.5')
    expect(last).toHaveAttribute('y', '87.5')
  })

  it('formats linear ticks on the left with a preset', () => {
    const { container } = render(
      <Chart {...frame} width={300} x={{ domain: [0, 1] }} y={{ domain: [30, 40] }}>
        <Axis side="left" ticks={2} format="percent" />
      </Chart>,
    )
    expect(labels(container)).toEqual(['30.0%', '35.0%', '40.0%'])
    const [first] = container.querySelectorAll('[data-ch-part="axis-label"]')
    expect(first).toHaveAttribute('text-anchor', 'end')
    expect(first).toHaveAttribute('x', '-8')
  })

  it('accepts a custom format function', () => {
    const { container } = render(
      <Chart {...frame} width={300} x={{ type: 'band', domain: ['a', 'b'] }} y={{ domain: [0, 1] }}>
        <Axis side="bottom" format={(v) => String(v).toUpperCase()} />
      </Chart>,
    )
    expect(labels(container)).toEqual(['A', 'B'])
  })

  it('thins crowded labels', () => {
    const domain = Array.from({ length: 12 }, (_, i) => `Week ${String(i + 1).padStart(2, '0')}`)
    const { container } = render(
      <Chart {...frame} width={200} x={{ type: 'band', domain, padding: 0 }} y={{ domain: [0, 1] }}>
        <Axis side="bottom" />
      </Chart>,
    )
    expect(labels(container)).toEqual(['Week 01', 'Week 05', 'Week 09'])
  })

  it('keeps every label when thinning is off', () => {
    const domain = Array.from({ length: 12 }, (_, i) => `Week ${i + 1}`)
    const { container } = render(
      <Chart {...frame} width={200} x={{ type: 'band', domain }} y={{ domain: [0, 1] }}>
        <Axis side="bottom" thin={false} />
      </Chart>,
    )
    expect(labels(container)).toHaveLength(12)
  })

  it('marks the highlighted label', () => {
    const { container } = render(
      <Chart
        {...frame}
        width={300}
        x={{ type: 'band', domain: ['W1', 'W2', 'W3'], padding: 0 }}
        y={{ domain: [0, 1] }}
      >
        <Axis side="bottom" highlight="W2" />
      </Chart>,
    )
    const marked = [...container.querySelectorAll('[data-ch-part="axis-label"]')].map((el) =>
      el.getAttribute('data-ch-active'),
    )
    expect(marked).toEqual([null, 'true', null])
  })
})
