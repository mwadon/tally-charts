import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart } from '../Chart'
import { LineChart } from '../charts/LineChart'
import { Area } from './Area'
import { Axis } from './Axis'
import { Band } from './Band'
import { Bars } from './Bars'
import { Grid } from './Grid'
import { Line } from './Line'
import { NearestPointer } from './NearestPointer'
import { Target } from './Target'

type Row = { week: string; rank: number; lo: number; hi: number }
const rows: Row[] = [
  { week: 'W1', rank: 1, lo: 1, hi: 3 },
  { week: 'W2', rank: 5, lo: 4, hi: 6 },
  { week: 'W3', rank: 10, lo: 8, hi: 10 },
]

// 300 × 100 with no margin: weeks at x 50, 150, 250. A reversed domain puts 1 at pixel 0 and
// 10 at pixel 100: y = 100 × (v − 1) / 9.
const frame = {
  title: 'Position',
  width: 300,
  height: 100,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  animate: false,
}
const reversed = { type: 'linear', field: 'rank', domain: [10, 1] } as const
// Marks round pixels to two decimals.
const at = (v: number) => Math.round((10000 * (v - 1)) / 9) / 100

function renderReversed(children: React.ReactNode) {
  return render(
    <Chart<Row> {...frame} data={rows} x={{ type: 'point', field: 'week' }} y={reversed}>
      {children}
    </Chart>,
  )
}

function renderBand(children: React.ReactNode) {
  return render(
    <Chart<Row> {...frame} data={rows} x={{ type: 'band', field: 'week', padding: 0 }} y={reversed}>
      {children}
    </Chart>,
  )
}

const part = (root: HTMLElement, name: string) =>
  root.querySelector(`[data-ch-part="${name}"]`) as Element
const parts = (root: HTMLElement, name: string) => [
  ...root.querySelectorAll(`[data-ch-part="${name}"]`),
]
const numbers = (d: string | null) => (d ?? '').match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []

describe('a reversed y scale, y={{ domain: [10, 1] }}', () => {
  it('puts the first value at the top and the last at the bottom', () => {
    const { container } = renderReversed(<Line<Row> />)
    const ys = numbers(part(container, 'line').getAttribute('d')).filter((_, i) => i % 2 === 1)
    expect(ys).toEqual([0, at(5), 100])
  })

  it('labels the axis ticks at their pixel positions, 10 at the bottom', () => {
    const { container } = renderReversed(<Axis side="left" />)
    const labels = parts(container, 'axis-label')
    expect(labels.map((l) => l.textContent)).toEqual(['10', '8', '6', '4', '2'])
    const ys = labels.map((l) => Number(l.getAttribute('y')))
    // The label sits on its tick, within a few px of the line for the value.
    ys.forEach((y, i) => {
      expect(Math.abs(y - at([10, 8, 6, 4, 2][i] as number))).toBeLessThan(6)
    })
    expect(ys).toEqual([...ys].sort((p, q) => q - p))
  })

  it('rules grid lines inside the plot', () => {
    const { container } = renderReversed(<Grid />)
    const ys = parts(container, 'grid-line').map((l) => Number(l.getAttribute('y1')))
    expect(ys.length).toBeGreaterThan(1)
    for (const y of ys) {
      expect(Number.isFinite(y)).toBe(true)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(100)
    }
  })

  it('draws a Band between the low and high values', () => {
    const { container } = renderReversed(<Band<Row> low="lo" high="hi" />)
    const d = part(container, 'band').getAttribute('d')
    const coords = numbers(d)
    expect(coords.every(Number.isFinite)).toBe(true)
    const ys = coords.filter((_, i) => i % 2 === 1)
    // The path runs along the highs W1..W3 and back along the lows.
    expect(ys.slice(0, 3)).toEqual([at(3), at(6), at(10)])
    expect(ys.slice(3)).toEqual([at(8), at(4), at(1)])
  })

  it('fills an Area from the line to the top edge, the reversed baseline', () => {
    const { container } = renderBand(<Area<Row> />)
    const ys = numbers(part(container, 'area').getAttribute('d')).filter((_, i) => i % 2 === 1)
    expect(ys.every(Number.isFinite)).toBe(true)
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(100)
    }
    expect(Math.min(...ys)).toBe(0)
  })

  it('fades an Area away from its baseline', () => {
    const { container } = renderBand(<Area<Row> />)
    const gradient = part(container, 'area-group').querySelector('linearGradient') as Element
    const stops = [...gradient.querySelectorAll('stop')]
    // The baseline is the top edge here, so the strong end of the fade is at the bottom, by the line.
    expect(gradient.getAttribute('y1')).toBe('1')
    expect(gradient.getAttribute('y2')).toBe('0')
    expect(stops).toHaveLength(2)
  })

  it('puts Target at the right pixel for a value', () => {
    const { container } = renderReversed(
      <>
        <Target y={5} />
        <Target y={1} />
        <Target y={10} />
      </>,
    )
    const ys = parts(container, 'target').map((l) => Number(l.getAttribute('y1')))
    expect(ys[0]).toBeCloseTo(at(5), 1)
    expect(ys.slice(1)).toEqual([0, 100])
  })

  it('does not draw Target outside the domain', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderReversed(<Target y={11} />)
    expect(parts(container, 'target')).toHaveLength(0)
    warn.mockRestore()
  })

  it('activates the nearest point under the pointer', () => {
    const onActiveChange = vi.fn()
    const { container } = render(
      <Chart<Row>
        {...frame}
        data={rows}
        x={{ type: 'point', field: 'week' }}
        y={reversed}
        onActiveChange={onActiveChange}
      >
        <Points />
        <NearestPointer />
      </Chart>,
    )
    const layer = part(container, 'pointer-layer')
    // jsdom's bounding box is at 0,0, so client coordinates are plot coordinates.
    fireEvent.pointerMove(layer, { clientX: 150, clientY: at(5) + 3 })
    expect(onActiveChange).toHaveBeenLastCalledWith('W2', expect.objectContaining({ id: 'W2' }))
    fireEvent.pointerMove(layer, { clientX: 60, clientY: 4 })
    expect(onActiveChange).toHaveBeenLastCalledWith('W1', expect.objectContaining({ id: 'W1' }))
  })
})

// Registers a point per row where Line draws its dot, as LineChart does.
import { useChartContext } from '../context'
import { useRegisterPoints } from '../useRegisterPoints'

function Points() {
  const ctx = useChartContext('Points')
  const y = ctx.y.kind === 'linear' ? ctx.y.scale : undefined
  useRegisterPoints(
    y
      ? rows.map((r, index) => ({
          id: r.week,
          index,
          datum: r,
          x: 50 + index * 100,
          y: y(r.rank),
          label: r.week,
          segments: [],
        }))
      : [],
  )
  return null
}

describe('LineChart with a reversed domain', () => {
  const renderLine = () =>
    render(
      <LineChart<Row>
        data={rows}
        x="week"
        series={[{ id: 'rank', label: 'Position', value: 'rank' }]}
        domain={[10, 1]}
        width={300}
        height={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        title="Average position"
        animate={false}
      />,
    )

  it('draws the line and the dots with finite coordinates, 1 on top', () => {
    const { container } = renderLine()
    const ys = numbers(part(container, 'line').getAttribute('d')).filter((_, i) => i % 2 === 1)
    expect(ys).toEqual([0, at(5), 100])
    const dots = parts(container, 'line-dot').map((d) => Number(d.getAttribute('cy')))
    expect(dots).toEqual([0, at(5), 100])
  })

  it('steps through the points in data order with the arrow keys', () => {
    const { container } = renderLine()
    const chart = screen.getByRole('application', { name: 'Average position' })
    const live = () => container.querySelector('[aria-live]')?.textContent
    fireEvent.keyDown(chart, { key: 'ArrowRight' })
    expect(live()).toMatch(/^1 of 3, W1/)
    fireEvent.keyDown(chart, { key: 'ArrowRight' })
    expect(live()).toMatch(/^2 of 3, W2/)
    fireEvent.keyDown(chart, { key: 'ArrowLeft' })
    expect(live()).toMatch(/^1 of 3, W1/)
    fireEvent.keyDown(chart, { key: 'End' })
    expect(live()).toMatch(/^3 of 3, W3/)
  })

  it('picks the nearest x with the pointer', () => {
    const onActiveChange = vi.fn()
    const { container } = render(
      <LineChart<Row>
        data={rows}
        x="week"
        series={[{ id: 'rank', label: 'Position', value: 'rank' }]}
        domain={[10, 1]}
        width={300}
        height={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        title="Average position"
        animate={false}
        onActiveChange={onActiveChange}
      />,
    )
    fireEvent.pointerMove(part(container, 'pointer-layer'), { clientX: 240, clientY: 5 })
    expect(onActiveChange).toHaveBeenLastCalledWith('W3', expect.objectContaining({ id: 'W3' }))
  })
})

describe('Bars on a reversed scale', () => {
  // The baseline is the domain value nearest zero, here 1, which sits on the top edge. Bars hang
  // from that edge and grow downward; a value of 5 is 4/9 of the plot tall. The bar for the
  // baseline value itself has no length.
  it('hangs bars from the baseline edge, pointing down', () => {
    const { container } = render(
      <Chart<Row>
        {...frame}
        data={rows}
        x={{ type: 'band', field: 'week', padding: 0 }}
        y={reversed}
      >
        <Bars<Row> />
      </Chart>,
    )
    const bars = parts(container, 'bar')
    expect(bars.map((b) => b.getAttribute('y'))).toEqual(['0', '0', '0'])
    const heights = bars.map((b) => Number(b.getAttribute('height')))
    expect(heights[0]).toBe(0)
    expect(heights[1]).toBeCloseTo(at(5), 1)
    expect(heights[2]).toBe(100)
    expect(bars.slice(1).map((b) => b.getAttribute('data-ch-direction'))).toEqual(['down', 'down'])
    expect(bars.every((b) => Number.isFinite(Number(b.getAttribute('rx'))))).toBe(true)
  })
})
