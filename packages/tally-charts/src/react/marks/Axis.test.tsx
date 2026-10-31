import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart } from '../Chart'
import { Axis } from './Axis'

const frame = { height: 100, margin: { top: 0, right: 0, bottom: 0, left: 0 }, animate: false }
const labels = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-ch-part="axis-label"]')].map((el) => el.textContent)

describe('<Axis>', () => {
  it('labels the band ends with outer anchors below the plot', () => {
    const { container } = render(
      <Chart
        title="Test chart"
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
        title="Test chart"
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
        title="Test chart"
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
      <Chart
        title="Test chart"
        {...frame}
        width={300}
        x={{ domain: [0, 1] }}
        y={{ domain: [30, 40] }}
      >
        <Axis side="left" ticks={2} format="percent" />
      </Chart>,
    )
    // Every tick is whole, so the percent preset drops its decimal.
    expect(labels(container)).toEqual(['30%', '35%', '40%'])
    const [first] = container.querySelectorAll('[data-ch-part="axis-label"]')
    expect(first).toHaveAttribute('text-anchor', 'end')
    expect(first).toHaveAttribute('x', '-8')
  })

  it('keeps the preset decimals when a tick is not whole', () => {
    const { container } = render(
      <Chart
        title="Test chart"
        {...frame}
        width={300}
        x={{ domain: [0, 1] }}
        y={{ domain: [0, 1] }}
      >
        <Axis side="left" ticks={2} format="percent" />
      </Chart>,
    )
    expect(labels(container)).toEqual(['0.0%', '0.5%', '1.0%'])
  })

  it('drops whole-tick decimals for pts and keeps explicit digits', () => {
    const { container } = render(
      <Chart
        title="Test chart"
        {...frame}
        width={300}
        x={{ domain: [-2, 2] }}
        y={{ domain: [30, 40] }}
      >
        <Axis side="bottom" ticks={2} format="pts" />
        <Axis side="left" ticks={2} format={{ preset: 'percent', digits: 2 }} />
      </Chart>,
    )
    expect(labels(container)).toEqual(['−2 pts', '0 pts', '+2 pts', '30.00%', '35.00%', '40.00%'])
  })

  it('gives a format function the number on a value axis', () => {
    const pct = (v: number) => `${v.toFixed(0)} pct`
    const { container } = render(
      <Chart
        title="Test chart"
        {...frame}
        width={300}
        x={{ domain: [0, 1] }}
        y={{ domain: [30, 40] }}
      >
        <Axis side="left" ticks={2} format={pct} />
      </Chart>,
    )
    expect(labels(container)).toEqual(['30 pct', '35 pct', '40 pct'])
  })

  it('ignores a date spec on a value axis', () => {
    const { container } = render(
      <Chart
        title="Test chart"
        {...frame}
        width={300}
        x={{ domain: [0, 1] }}
        y={{ domain: [30, 40] }}
      >
        <Axis side="left" ticks={2} format="month" />
      </Chart>,
    )
    expect(labels(container)).toEqual(['30', '35', '40'])
  })

  it('accepts a custom format function', () => {
    const { container } = render(
      <Chart
        title="Test chart"
        {...frame}
        width={300}
        x={{ type: 'band', domain: ['a', 'b'] }}
        y={{ domain: [0, 1] }}
      >
        <Axis side="bottom" format={(v) => String(v).toUpperCase()} />
      </Chart>,
    )
    expect(labels(container)).toEqual(['A', 'B'])
  })

  it('thins crowded labels', () => {
    const domain = Array.from({ length: 12 }, (_, i) => `Week ${String(i + 1).padStart(2, '0')}`)
    const { container } = render(
      <Chart
        title="Test chart"
        {...frame}
        width={200}
        x={{ type: 'band', domain, padding: 0 }}
        y={{ domain: [0, 1] }}
      >
        <Axis side="bottom" />
      </Chart>,
    )
    expect(labels(container)).toEqual(['Week 01', 'Week 05', 'Week 09'])
  })

  it('keeps every label when thinning is off', () => {
    const domain = Array.from({ length: 12 }, (_, i) => `Week ${i + 1}`)
    const { container } = render(
      <Chart
        title="Test chart"
        {...frame}
        width={200}
        x={{ type: 'band', domain }}
        y={{ domain: [0, 1] }}
      >
        <Axis side="bottom" thin={false} />
      </Chart>,
    )
    expect(labels(container)).toHaveLength(12)
  })

  it('marks the highlighted label', () => {
    const { container } = render(
      <Chart
        title="Test chart"
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

  it('keeps the highlighted label when thinning would drop it', () => {
    const domain = ['Planned profit', 'Price', 'Volume', 'Mix', 'Cost', 'Actual profit']
    const chart = (highlight?: string) => (
      <Chart
        title="Test chart"
        {...frame}
        width={200}
        x={{ type: 'band', domain, padding: 0 }}
        y={{ domain: [0, 1] }}
      >
        <Axis side="bottom" highlight={highlight} />
      </Chart>
    )
    expect(labels(render(chart()).container)).not.toContain('Actual profit')
    const { container } = render(chart('Actual profit'))
    expect(labels(container)).toEqual(['Planned profit', 'Actual profit'])
    const active = container.querySelector('[data-ch-part="axis-label"][data-ch-active="true"]')
    expect(active?.textContent).toBe('Actual profit')
  })

  it('labels only the extent it is given on a padded scale', () => {
    const { container } = render(
      <Chart
        title="Test chart"
        {...frame}
        width={340}
        x={{ domain: [30, 64] }}
        y={{ type: 'band', domain: ['a'] }}
      >
        <Axis side="bottom" ticks="ends" extent={[34, 64]} />
      </Chart>,
    )
    expect(labels(container)).toEqual(['34', '64'])
    expect(container.querySelector('[data-ch-part="axis-label"]')).toHaveAttribute('x', '40')
  })

  it('labels point scales at their positions', () => {
    const { container } = render(
      <Chart
        title="Test chart"
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

  describe('with a list of ticks', () => {
    it('labels those values on a linear axis', () => {
      const { container } = render(
        <Chart
          title="Test chart"
          {...frame}
          width={300}
          x={{ domain: [0, 1] }}
          y={{ domain: [0, 40] }}
        >
          <Axis side="left" ticks={[0, 10, 25, 99]} />
        </Chart>,
      )
      expect(labels(container)).toEqual(['0', '10', '25'])
      const all = [...container.querySelectorAll('[data-ch-part="axis-label"]')]
      expect(all.map((el) => el.getAttribute('y'))).toEqual(['100', '75', '37.5'])
    })

    it('places them on a y2 axis with a reversed domain', () => {
      const { container } = render(
        <Chart
          title="Test chart"
          {...frame}
          width={300}
          x={{ domain: [0, 1] }}
          y={{ domain: [0, 40] }}
          y2={{ domain: [100, 0] }}
        >
          <Axis side="right" scale="y2" ticks={[75, 25, 150]} />
        </Chart>,
      )
      expect(labels(container)).toEqual(['25', '75'])
      const all = [...container.querySelectorAll('[data-ch-part="axis-label"]')]
      expect(all.map((el) => el.getAttribute('y'))).toEqual(['25', '75'])
    })

    it('warns and falls back to every category on a band axis', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { container } = render(
        <Chart
          title="Test chart"
          {...frame}
          width={300}
          x={{ type: 'band', domain: ['W1', 'W2', 'W3'], padding: 0 }}
          y={{ domain: [0, 1] }}
        >
          <Axis side="bottom" ticks={[1, 2]} />
        </Chart>,
      )
      expect(labels(container)).toEqual(['W1', 'W2', 'W3'])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('needs a linear scale'))
      warn.mockRestore()
    })

    it('warns and falls back to the default ticks on a time axis', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const chart = (ticks?: number[]) => (
        <Chart
          title="Test chart"
          {...frame}
          width={600}
          x={{ type: 'time', domain: [new Date('2026-01-01'), new Date('2026-06-01')] }}
          y={{ domain: [0, 1] }}
        >
          <Axis side="bottom" ticks={ticks} />
        </Chart>
      )
      const defaults = labels(render(chart()).container)
      expect(warn).not.toHaveBeenCalled()
      expect(labels(render(chart([1, 2])).container)).toEqual(defaults)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('needs a linear scale'))
      warn.mockRestore()
    })
  })
})
