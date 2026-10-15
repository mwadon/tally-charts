import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart, type ChartProps } from '../Chart'
import { Band } from './Band'

type Row = { m: string; lo: number | null; hi: number | null }
const rows: Row[] = [
  { m: 'Apr', lo: 1, hi: 3 },
  { m: 'May', lo: 3, hi: 4 },
  { m: 'Jun', lo: 2, hi: 5 },
]

// 300 × 100 with no margin: x 50, 150, 250; y = 100 − 10 × v.
function renderBand(chart: Partial<ChartProps<Row>> = {}) {
  return render(
    <Chart<Row>
      title="Band"
      width={300}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      data={rows}
      x={{ type: 'point', field: 'm' }}
      y={{ domain: [0, 10] }}
      {...chart}
    >
      <Band<Row> low="lo" high="hi" />
    </Chart>,
  )
}

const band = (root: HTMLElement) => root.querySelector('[data-ch-part="band"]')

describe('<Band>', () => {
  it('fills between the low and high values', () => {
    const { container } = renderBand()
    expect(band(container)).toHaveAttribute('d', 'M50,70L150,60L250,50L250,80L150,70L50,90Z')
    expect(band(container)).toHaveAttribute('data-ch-tone', 'accent')
  })

  it('clamps values outside the domain into the plot', () => {
    const { container } = renderBand({
      data: rows.map((r) => (r.m === 'Jun' ? { ...r, hi: 12 } : r)),
    })
    expect(band(container)).toHaveAttribute('d', 'M50,70L150,60L250,0L250,80L150,70L50,90Z')
  })

  it('breaks at a missing value and draws nothing without two complete points', () => {
    const { container } = renderBand({
      data: rows.map((r) => (r.m === 'May' ? { ...r, lo: null } : r)),
    })
    expect(band(container)).toBeNull()
    expect(container.innerHTML).not.toContain('NaN')
  })

  it('warns on a linear x scale', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderBand({ x: { domain: [0, 1] } })
    expect(band(container)).toBeNull()
    expect(warn.mock.calls[0]?.[0]).toContain('Band needs a point, band or time scale')
  })
})
