import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Chart, type ChartProps } from '../Chart'
import { Bars, type BarsProps } from './Bars'

type Week = { week: string; margin: number | null }
const weeks: Week[] = [
  { week: 'W1', margin: 10 },
  { week: 'W2', margin: 20 },
]

function renderBars(props: BarsProps<Week> = {}, chart: Partial<ChartProps<Week>> = {}) {
  return render(
    <Chart<Week>
      data={weeks}
      width={200}
      height={120}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      x={{ type: 'band', field: 'week', padding: 0 }}
      y={{ field: 'margin', domain: [0, 20] }}
      animate={false}
      {...chart}
    >
      <Bars<Week> {...props} />
    </Chart>,
  )
}

const bars = (root: HTMLElement) => [...root.querySelectorAll('[data-ch-part="bar"]')]
const hits = (root: HTMLElement) => [...root.querySelectorAll('[data-ch-part="bar-hit"]')]

describe('<Bars>', () => {
  afterEach(() => vi.restoreAllMocks())

  it('draws one bar per datum using the chart fields', () => {
    const { container } = renderBars()
    const [a, b] = bars(container)
    expect(bars(container)).toHaveLength(2)
    expect(a).toHaveAttribute('x', '0')
    expect(a).toHaveAttribute('width', '100')
    expect(a).toHaveAttribute('y', '60')
    expect(a).toHaveAttribute('height', '60')
    expect(b).toHaveAttribute('y', '0')
    expect(b).toHaveAttribute('height', '120')
  })

  it('applies tone and fill per item', () => {
    const { container } = renderBars({
      tone: 'accent',
      fill: (_, i, all) => (i === all.length - 1 ? 'solid' : 'hatch-fade'),
    })
    const [a, b] = bars(container)
    expect(a).toHaveAttribute('data-ch-fill', 'hatch-fade')
    expect(a).toHaveAttribute('data-ch-tone', 'accent')
    expect(b).toHaveAttribute('data-ch-fill', 'solid')
  })

  it('skips missing values and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderBars(
      { y: 'margin' },
      {
        data: [
          { week: 'W1', margin: null },
          { week: 'W2', margin: 20 },
          { week: 'W3', margin: Number.NaN },
        ],
      },
    )
    expect(bars(container)).toHaveLength(1)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain(
      'missing or non-numeric value for field "margin"',
    )
  })

  it('draws negative values below the zero baseline', () => {
    const { container } = renderBars(
      {},
      {
        data: [
          { week: 'W1', margin: -10 },
          { week: 'W2', margin: 10 },
        ],
        y: { field: 'margin', domain: [-10, 10] },
      },
    )
    const [a, b] = bars(container)
    expect(a).toHaveAttribute('data-ch-dir', 'down')
    expect(a).toHaveAttribute('y', '60')
    expect(a).toHaveAttribute('height', '60')
    expect(b).toHaveAttribute('data-ch-dir', 'up')
    expect(b).toHaveAttribute('y', '0')
  })

  it('renders zero-height bars for all-zero data', () => {
    const { container } = renderBars(
      {},
      {
        data: [
          { week: 'W1', margin: 0 },
          { week: 'W2', margin: 0 },
        ],
        y: { field: 'margin' },
      },
    )
    for (const bar of bars(container)) {
      expect(bar).toHaveAttribute('height', '0')
      expect(bar).toHaveAttribute('y', '120')
    }
  })

  it('switches to horizontal bars when y is the band scale', () => {
    const { container } = renderBars(
      {},
      {
        height: 100,
        x: { field: 'margin', domain: [0, 20] },
        y: { type: 'band', field: 'week', padding: 0 },
      },
    )
    const [a] = bars(container)
    expect(a).toHaveAttribute('data-ch-dir', 'right')
    expect(a).toHaveAttribute('width', '100')
    expect(a).toHaveAttribute('height', '50')
  })

  it('dims the other bars while one is active', () => {
    const { container } = renderBars()
    fireEvent.pointerEnter(hits(container)[1] as Element)
    const [a, b] = bars(container)
    expect(a).toHaveAttribute('data-ch-dimmed', 'true')
    expect(b).toHaveAttribute('data-ch-active', 'true')
    expect(b).not.toHaveAttribute('data-ch-dimmed')
  })

  it('does not dim when dimInactive is false', () => {
    const { container } = renderBars({}, { dimInactive: false })
    fireEvent.pointerEnter(hits(container)[1] as Element)
    expect(bars(container)[1]).toHaveAttribute('data-ch-active', 'true')
    expect(container.querySelector('[data-ch-dimmed]')).toBeNull()
  })

  it('does not dim any bar when activeId matches no bar', () => {
    const { container } = renderBars({}, { activeId: 'nope' })
    expect(container.querySelector('[data-ch-dimmed]')).toBeNull()
    expect(container.querySelector('[data-ch-active]')).toBeNull()
  })

  it('names the horizontal value axis in the missing-value warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderBars(
      {},
      {
        data: [{ week: 'W1', margin: null }],
        x: { field: 'margin', domain: [0, 20] },
        y: { type: 'band', field: 'week', padding: 0 },
      },
    )
    expect(String(warn.mock.calls[0]?.[0])).toContain('for field "x"')
  })

  it('makes the hit area span the full band height', () => {
    const { container } = renderBars()
    const [hit] = hits(container)
    expect(hit).toHaveAttribute('y', '0')
    expect(hit).toHaveAttribute('height', '120')
  })

  it('keeps geometry finite at zero width', () => {
    const { container } = renderBars({}, { width: 0 })
    for (const el of [...bars(container), ...hits(container)]) {
      for (const attr of ['x', 'y', 'width', 'height']) {
        const value = Number(el.getAttribute(attr))
        expect(Number.isNaN(value)).toBe(false)
        expect(value).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('registers readable points for the keyboard', () => {
    const { container } = renderBars({ format: 'percent' })
    fireEvent.keyDown(screen.getByRole('figure'), { key: 'ArrowRight' })
    expect(container.querySelector('[aria-live]')).toHaveTextContent('W1, 10.0%')
  })

  it('uses a label accessor for announcements', () => {
    const { container } = renderBars({ label: (d) => `Week of ${d.week}` })
    fireEvent.keyDown(screen.getByRole('figure'), { key: 'End' })
    expect(container.querySelector('[aria-live]')).toHaveTextContent('Week of W2, 20')
  })
})
