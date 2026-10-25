import { render } from '@testing-library/react'
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
})
