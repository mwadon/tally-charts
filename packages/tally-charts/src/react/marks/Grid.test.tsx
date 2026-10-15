import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart } from '../Chart'
import { Grid, type GridProps } from './Grid'

function renderGrid(props: GridProps = {}, y: { domain: [number, number] } = { domain: [30, 40] }) {
  return render(
    <Chart
      title="Grid"
      width={300}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      x={{ type: 'point', domain: ['a'] }}
      y={y}
    >
      <Grid {...props} />
    </Chart>,
  )
}

const lines = (root: HTMLElement) => [...root.querySelectorAll('[data-ch-part="grid-line"]')]

describe('<Grid>', () => {
  it('rules a line across the plot at each y tick', () => {
    const { container } = renderGrid()
    expect(lines(container).map((l) => l.getAttribute('y1'))).toEqual([
      '100',
      '80',
      '60',
      '40',
      '20',
      '0',
    ])
    expect(lines(container)[0]).toHaveAttribute('x1', '0')
    expect(lines(container)[0]).toHaveAttribute('x2', '300')
  })

  it('follows a tick count and an extent like the axis does', () => {
    const y1 = (root: HTMLElement) => lines(root).map((l) => l.getAttribute('y1'))
    // y = 100 − 10 × (v − 30): 30, 35, 40 and then 32 … 38.
    expect(y1(renderGrid({ ticks: 2 }).container)).toEqual(['100', '50', '0'])
    expect(y1(renderGrid({ extent: [32, 38] }).container)).toEqual([
      '80',
      '70',
      '60',
      '50',
      '40',
      '30',
      '20',
    ])
  })

  it('warns without a linear y scale', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <Chart
        title="Grid"
        width={300}
        height={100}
        x={{ domain: [0, 1] }}
        y={{ type: 'band', domain: ['a'] }}
      >
        <Grid />
      </Chart>,
    )
    expect(lines(container)).toHaveLength(0)
    expect(warn.mock.calls[0]?.[0]).toContain('Grid needs a linear scale on <Chart y>')
  })
})
