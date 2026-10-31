import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart } from '../Chart'
import { Target } from './Target'

const frame = {
  title: 'Target',
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

  it('draws nothing for a value outside the domain or non-finite', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <Chart {...frame} x={{ domain: [0, 1] }} y={{ domain: [26, 40] }}>
        <Target y={50} />
        <Target y={Number.NaN} />
      </Chart>,
    )
    expect(container.querySelector('[data-ch-part="target"]')).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  describe('on category scales', () => {
    const buckets = Array.from({ length: 10 }, (_, i) => `${i * 10}–${i * 10 + 9}`)
    const wide = { ...frame, width: 500 }
    const step = 50
    const x1 = (container: HTMLElement) =>
      Number(container.querySelector('[data-ch-part="target"]')?.getAttribute('x1'))
    const band = (children: React.ReactNode, type: 'band' | 'point' = 'band') =>
      render(
        <Chart
          {...wide}
          x={{ type, domain: buckets, padding: type === 'band' ? 0 : 0.5 }}
          y={{ domain: [0, 1] }}
        >
          {children}
        </Chart>,
      )

    it('places the rule at a fraction of the category step', () => {
      const { container } = band(<Target x="70–79" position={0.3} />)
      expect(x1(container)).toBeCloseTo(7.3 * step, 6)
    })

    it('defaults to the centre of the category', () => {
      const { container } = band(<Target x="70–79" />)
      expect(x1(container)).toBeCloseTo(7.5 * step, 6)
    })

    it('puts the end of one category on the start of the next', () => {
      const end = x1(band(<Target x="30–39" position={1} />).container)
      const start = x1(band(<Target x="40–49" position={0} />).container)
      expect(end).toBeCloseTo(start, 6)
    })

    it('stays inside the plot at the outer edges, also with one category', () => {
      expect(x1(band(<Target x="0–9" position={0} />).container)).toBeGreaterThanOrEqual(0)
      expect(x1(band(<Target x="90–99" position={1} />).container)).toBeLessThanOrEqual(500)
      const one = render(
        <Chart {...wide} x={{ type: 'band', domain: ['a'] }} y={{ domain: [0, 1] }}>
          <Target x="a" position={0} />
          <Target x="a" position={1} />
        </Chart>,
      )
      const xs = [...one.container.querySelectorAll('[data-ch-part="target"]')].map((l) =>
        Number(l.getAttribute('x1')),
      )
      for (const x of xs) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(500)
      }
    })

    it('warns and draws nothing for an unknown category', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { container } = band(<Target x="nope" />)
      expect(container.querySelector('[data-ch-part="target"]')).toBeNull()
      expect(String(warn.mock.calls[0]?.[0])).toContain('nope')
      warn.mockRestore()
    })

    it('clamps a position outside 0 to 1 and warns', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { container } = band(<Target x="30–39" position={1.5} />)
      expect(x1(container)).toBeCloseTo(4 * step, 6)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(String(warn.mock.calls[0]?.[0])).toContain('Target position 1.5 is outside 0 to 1')
      warn.mockRestore()
    })

    it('warns and ignores position on a linear scale', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { container } = render(
        <Chart {...wide} x={{ domain: [0, 100] }} y={{ domain: [0, 1] }}>
          <Target x={50} position={0.2} />
        </Chart>,
      )
      expect(x1(container)).toBe(250)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(String(warn.mock.calls[0]?.[0])).toContain(
        '`position` only applies on a band or point scale',
      )
      warn.mockRestore()
    })

    it('draws a horizontal rule for a band y', () => {
      const { container } = render(
        <Chart
          {...wide}
          height={100}
          x={{ domain: [0, 1] }}
          y={{ type: 'band', domain: ['a', 'b'] }}
        >
          <Target y="b" />
        </Chart>,
      )
      const line = container.querySelector('[data-ch-part="target"]')
      expect(line).toHaveAttribute('x1', '0')
      expect(line).toHaveAttribute('x2', '500')
      expect(Number(line?.getAttribute('y1'))).toBeGreaterThan(0)
      expect(line?.getAttribute('y1')).toBe(line?.getAttribute('y2'))
    })

    it('works on a point scale', () => {
      const { container } = band(<Target x="70–79" />, 'point')
      expect(x1(container)).toBeCloseTo(7.5 * step, 6)
    })
  })
})
