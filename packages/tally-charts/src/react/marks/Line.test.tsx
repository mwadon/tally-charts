import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart, type ChartProps } from '../Chart'
import { useRegisterPoints } from '../useRegisterPoints'
import { Line, type LineProps } from './Line'

type Row = { m: string; v: number | null }
const rows: Row[] = [
  { m: 'Apr', v: 2 },
  { m: 'May', v: 5 },
  { m: 'Jun', v: 8 },
]

// 300 × 100 with no margin: points at x 50, 150 and 250; y = 100 − 10 × v.
function renderLine(props: Partial<LineProps<Row>> = {}, chart: Partial<ChartProps<Row>> = {}) {
  return render(
    <Chart<Row>
      width={300}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      animate={false}
      data={rows}
      x={{ type: 'point', field: 'm' }}
      y={{ field: 'v', domain: [0, 10] }}
      {...chart}
    >
      <Line<Row> {...props} />
      <Points />
    </Chart>,
  )
}

// The chart only reports an active id that matches a registered point, as LineChart will.
function Points() {
  useRegisterPoints(
    rows.map((r, index) => ({
      id: r.m,
      index,
      datum: null,
      x: 0,
      y: 0,
      label: r.m,
      segments: [],
    })),
  )
  return null
}

const parts = (root: HTMLElement, part: string) => [
  ...root.querySelectorAll(`[data-ch-part="${part}"]`),
]
const attrs = (els: Element[], name: string) => els.map((el) => el.getAttribute(name))

describe('<Line>', () => {
  it('draws straight segments through the points, with filled dots', () => {
    const { container } = renderLine()
    expect(parts(container, 'line')[0]).toHaveAttribute('d', 'M50,80L150,50L250,20')
    expect(parts(container, 'line')[0]).not.toHaveAttribute('data-ch-dashed')
    expect(parts(container, 'line-group')[0]).toHaveAttribute('data-ch-tone', 'accent')
    const dots = parts(container, 'line-dot')
    expect(attrs(dots, 'cx')).toEqual(['50', '150', '250'])
    expect(attrs(dots, 'cy')).toEqual(['80', '50', '20'])
    expect(attrs(dots, 'r')).toEqual(['4', '4', '4'])
    expect(dots.some((d) => d.hasAttribute('data-ch-hollow'))).toBe(false)
  })

  it('dashes the line and hollows the dots on request', () => {
    const { container } = renderLine({ dashed: true, dots: 'hollow', tone: 'gain' })
    expect(parts(container, 'line')[0]).toHaveAttribute('data-ch-dashed', 'true')
    expect(parts(container, 'line-group')[0]).toHaveAttribute('data-ch-tone', 'gain')
    expect(attrs(parts(container, 'line-dot'), 'data-ch-hollow')).toEqual(['true', 'true', 'true'])
  })

  it('leaves the dots out on request', () => {
    const { container } = renderLine({ dots: 'none' })
    expect(parts(container, 'line-dot')).toHaveLength(0)
    expect(parts(container, 'line')).toHaveLength(1)
  })

  it('skips missing values', () => {
    const { container } = renderLine(
      {},
      { data: rows.map((r) => (r.m === 'May' ? { ...r, v: null } : r)) },
    )
    expect(attrs(parts(container, 'line-dot'), 'cx')).toEqual(['50', '250'])
    // Two lone points: no segment to draw.
    expect(parts(container, 'line')).toHaveLength(0)
    expect(container.innerHTML).not.toContain('NaN')
  })

  it('clamps values outside the domain into the plot', () => {
    const { container } = renderLine(
      {},
      {
        data: [
          { m: 'Apr', v: -5 },
          { m: 'May', v: 5 },
          { m: 'Jun', v: 15 },
        ],
      },
    )
    expect(parts(container, 'line')[0]).toHaveAttribute('d', 'M50,100L150,50L250,0')
    expect(attrs(parts(container, 'line-dot'), 'cy')).toEqual(['100', '50', '0'])
  })

  it('rings the dot at the active category', () => {
    const { container } = renderLine({}, { activeId: 'May' })
    const ring = parts(container, 'dot-ring')
    expect(ring).toHaveLength(1)
    expect(ring[0]).toHaveAttribute('cx', '150')
    expect(ring[0]).toHaveAttribute('cy', '50')
    expect(ring[0]).toHaveAttribute('r', '7')
    const other = renderLine({}, { activeId: 'Dec' })
    expect(parts(other.container, 'dot-ring')).toHaveLength(0)
  })

  it('reads its own data and fields, and centres on bands', () => {
    const { container } = render(
      <Chart
        width={300}
        height={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        x={{ type: 'band', domain: ['Apr', 'May', 'Jun'], padding: 0 }}
        y={{ domain: [0, 10] }}
      >
        <Line<Row> data={rows} x="m" y="v" />
      </Chart>,
    )
    expect(parts(container, 'line')[0]).toHaveAttribute('d', 'M50,80L150,50L250,20')
  })

  it('warns and draws nothing on a linear x scale', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderLine({}, { x: { domain: [0, 1] } })
    expect(parts(container, 'line-group')).toHaveLength(0)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('Line needs a point, band or time scale')
  })
})
