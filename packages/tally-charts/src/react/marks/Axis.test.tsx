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

  it('anchors point labels on the plot edges inward at padding 0', () => {
    const { container } = render(
      <Chart
        {...frame}
        width={300}
        x={{ type: 'point', domain: ['Apr', 'May', 'Jun', 'Jul'], padding: 0 }}
        y={{ domain: [0, 1] }}
      >
        <Axis side="bottom" />
      </Chart>,
    )
    const all = [...container.querySelectorAll('[data-ch-part="axis-label"]')]
    expect(all.map((el) => el.getAttribute('x'))).toEqual(['0', '100', '200', '300'])
    expect(all.map((el) => el.getAttribute('text-anchor'))).toEqual([
      'start',
      'middle',
      'middle',
      'end',
    ])
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

  it('labels only the extent it is given on a padded scale', () => {
    const { container } = render(
      <Chart {...frame} width={340} x={{ domain: [30, 64] }} y={{ type: 'band', domain: ['a'] }}>
        <Axis side="bottom" ticks="ends" extent={[34, 64]} />
      </Chart>,
    )
    expect(labels(container)).toEqual(['34', '64'])
    expect(container.querySelector('[data-ch-part="axis-label"]')).toHaveAttribute('x', '40')
  })

  it('labels point scales at their positions', () => {
    const { container } = render(
      <Chart
        {...frame}
        width={400}
        x={{ type: 'point', domain: ['Apr', 'May', 'Jun', 'Jul'] }}
        y={{ type: 'point', domain: ['a', 'b'] }}
      >
        <Axis side="bottom" />
        <Axis side="left" />
      </Chart>,
    )
    const all = [...container.querySelectorAll('[data-ch-part="axis-label"]')]
    expect(all.map((el) => el.textContent)).toEqual(['Apr', 'May', 'Jun', 'Jul', 'a', 'b'])
    expect(all.slice(0, 4).map((el) => el.getAttribute('x'))).toEqual(['50', '150', '250', '350'])
    expect(all[0]).toHaveAttribute('text-anchor', 'middle')
    expect(all.slice(4).map((el) => el.getAttribute('y'))).toEqual(['25', '75'])
  })
})
