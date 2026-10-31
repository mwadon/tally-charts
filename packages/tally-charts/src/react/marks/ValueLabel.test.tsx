import { render } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Chart } from '../Chart'
import { ValueLabel } from './ValueLabel'

const weeks = [
  { week: 'W1', margin: 10 },
  { week: 'W2', margin: 20 },
]

function renderLabels(at: 'first' | 'last' | 'all' | number) {
  return render(
    <Chart
      title="Test chart"
      data={weeks}
      width={200}
      height={120}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      x={{ type: 'band', field: 'week', padding: 0 }}
      y={{ field: 'margin', domain: [0, 20] }}
    >
      <ValueLabel at={at} format={(v) => v.toFixed(1)} />
    </Chart>,
  )
}

const texts = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-ch-part="value-label"]')].map((el) => el.textContent)

describe('<ValueLabel>', () => {
  it('labels only the last bar above its top', () => {
    const { container } = renderLabels('last')
    expect(texts(container)).toEqual(['20.0'])
    const label = container.querySelector('[data-ch-part="value-label"]')
    expect(label).toHaveAttribute('x', '150')
    expect(label).toHaveAttribute('y', '-6')
    expect(label).toHaveAttribute('text-anchor', 'middle')
  })

  it('labels every bar', () => {
    expect(texts(renderLabels('all').container)).toEqual(['10.0', '20.0'])
  })

  it('labels the first bar', () => {
    expect(texts(renderLabels('first').container)).toEqual(['10.0'])
  })

  it('labels a bar by index', () => {
    expect(texts(renderLabels(1).container)).toEqual(['20.0'])
  })

  it('labels its own data', () => {
    const { container } = render(
      <Chart
        title="Test chart"
        data={weeks}
        width={200}
        height={120}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        x={{ type: 'band', field: 'week', padding: 0 }}
        y={{ field: 'margin', domain: [0, 20] }}
      >
        <ValueLabel data={[{ week: 'W2', margin: 5 }]} format={(v) => v.toFixed(1)} />
      </Chart>,
    )
    expect(texts(container)).toEqual(['5.0'])
  })

  it('keeps the label of a value below the domain inside the plot', () => {
    const { container } = render(
      <Chart
        title="Test chart"
        data={[{ week: 'W1', margin: -5 }]}
        width={200}
        height={120}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        x={{ type: 'band', field: 'week', padding: 0 }}
        y={{ field: 'margin', domain: [10, 40] }}
      >
        <ValueLabel />
      </Chart>,
    )
    const label = container.querySelector('[data-ch-part="value-label"]')
    expect(label).toHaveAttribute('y', '114')
    expect(label).toHaveAttribute('dominant-baseline', 'auto')
  })

  describe('at="max"', () => {
    function renderMax(
      rows: readonly { week: string; margin: number }[],
      extra: {
        variant?: 'text' | 'pill'
        margin?: Partial<{ top: number; left: number; right: number }>
      } = {},
    ) {
      return render(
        <Chart
          title="Test chart"
          data={rows}
          width={200}
          height={120}
          margin={{ top: 24, right: 0, bottom: 0, left: 0, ...extra.margin }}
          x={{ type: 'band', field: 'week', padding: 0 }}
          y={{ field: 'margin' }}
        >
          <ValueLabel at="max" variant={extra.variant} format={(v) => v.toFixed(1)} />
        </Chart>,
      )
    }

    it('labels only the highest bar', () => {
      const { container } = renderMax([
        { week: 'W1', margin: 10 },
        { week: 'W2', margin: 30 },
        { week: 'W3', margin: 20 },
      ])
      expect(texts(container)).toEqual(['30.0'])
    })

    it('ignores NaN values', () => {
      const { container } = renderMax([
        { week: 'W1', margin: 10 },
        { week: 'W2', margin: Number.NaN },
        { week: 'W3', margin: 5 },
      ])
      expect(texts(container)).toEqual(['10.0'])
    })

    it('picks the first of tied bars', () => {
      const { container } = renderMax([
        { week: 'W1', margin: 20 },
        { week: 'W2', margin: 20 },
      ])
      const label = container.querySelector('[data-ch-part="value-label"]')
      expect(texts(container)).toEqual(['20.0'])
      expect(Number(label?.getAttribute('x'))).toBeLessThan(100)
    })

    it('renders nothing, without crashing, when no value is finite', () => {
      const { container } = renderMax([
        { week: 'W1', margin: Number.NaN },
        { week: 'W2', margin: Number.NaN },
      ])
      expect(texts(container)).toEqual([])
    })

    it('takes the value closest to zero when all are negative', () => {
      const { container } = renderMax([
        { week: 'W1', margin: -30 },
        { week: 'W2', margin: -5 },
        { week: 'W3', margin: -10 },
      ])
      expect(texts(container)).toEqual(['-5.0'])
    })
  })

  describe('variant="pill"', () => {
    const rows = [
      { week: 'W1', margin: 30 },
      { week: 'W2', margin: 10 },
      { week: 'W3', margin: 20 },
    ]
    const chart = (
      at: 'first' | 'last' | 'max',
      margin = { top: 24, right: 0, bottom: 0, left: 0 },
    ) => (
      <Chart
        title="Test chart"
        data={rows}
        width={200}
        height={120}
        margin={margin}
        x={{ type: 'band', field: 'week', padding: 0 }}
        y={{ field: 'margin', domain: [0, 30] }}
      >
        <ValueLabel at={at} variant="pill" format={(v) => v.toFixed(1)} />
      </Chart>
    )

    it('renders a rect and the text, sized from the text', () => {
      const { container } = render(chart('max'))
      const rect = container.querySelector('rect[data-ch-part="value-label-pill"]')
      expect(rect).not.toBeNull()
      // "30.0" is 4 chars at 6.5 px each, plus 8 px of padding on both sides.
      expect(rect).toHaveAttribute('width', String(4 * 6.5 + 16))
      expect(rect).toHaveAttribute('height', '18')
      expect(texts(container)).toEqual(['30.0'])
    })

    it('renders in renderToString too', () => {
      const html = renderToString(chart('max'))
      expect(html).toContain('data-ch-part="value-label-pill"')
      expect(html).toContain('30.0')
    })

    it('keeps the pill inside the margins on the first and last bars', () => {
      const margin = { top: 24, right: 10, bottom: 0, left: 10 }
      for (const at of ['first', 'last'] as const) {
        const { container } = render(chart(at, margin))
        const rect = container.querySelector('rect[data-ch-part="value-label-pill"]')
        const x = Number(rect?.getAttribute('x'))
        const width = Number(rect?.getAttribute('width'))
        expect(x).toBeGreaterThanOrEqual(-10)
        expect(x + width).toBeLessThanOrEqual(180 + 10)
      }
    })

    it('sits above the plot on the tallest bar, inside a 24 px top margin', () => {
      const { container } = render(chart('max'))
      const rect = container.querySelector('rect[data-ch-part="value-label-pill"]')
      const y = Number(rect?.getAttribute('y'))
      expect(y).toBe(-6 - 18)
      expect(y).toBeGreaterThanOrEqual(-24)
    })

    it('leaves the text markup unchanged by default', () => {
      const { container } = renderLabels('last')
      expect(container.querySelector('[data-ch-part="value-label-pill"]')).toBeNull()
      expect(container.querySelector('[data-ch-part="value-label"]')?.attributes).toHaveLength(5)
    })
  })
})
