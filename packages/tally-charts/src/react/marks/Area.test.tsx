import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart } from '../Chart'
import { Area, type AreaProps } from './Area'

type Row = { k: string; v: number | null }
const rows: Row[] = [
  { k: 'a', v: 100 },
  { k: 'b', v: 50 },
  { k: 'c', v: 0 },
]

function renderArea(props: AreaProps<Row> = {}, data: Row[] = rows) {
  return render(
    <Chart<Row>
      title="Test chart"
      data={data}
      width={300}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      x={{ type: 'band', field: 'k', padding: 0 }}
      y={{ field: 'v', domain: [0, 100] }}
      animate={false}
    >
      <Area<Row> {...props} />
    </Chart>,
  )
}

const path = (root: HTMLElement) => root.querySelector('[data-ch-part="area"]')

describe('<Area>', () => {
  it('fills from the band centres down to the baseline', () => {
    const { container } = renderArea()
    expect(path(container)).toHaveAttribute('d', 'M50,0L150,50L250,100L250,100L50,100Z')
  })

  it('fills only the gaps between bands on request, so bars keep their own fill', () => {
    const { container } = render(
      <Chart<Row>
        title="Test chart"
        data={rows}
        width={300}
        height={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        x={{ type: 'band', field: 'k', padding: 0.5 }}
        y={{ field: 'v', domain: [0, 100] }}
        animate={false}
      >
        <Area<Row> between />
      </Chart>,
    )
    // Bands are 60px wide on a 120px step: a = 0–60, b = 120–180, c = 240–300.
    expect(path(container)).toHaveAttribute(
      'd',
      'M60,0L120,50L120,100L60,100ZM180,50L240,100L240,100L180,100Z',
    )
  })

  it('paints a fading gradient in the tone', () => {
    const { container } = renderArea({ tone: 'loss', opacity: 0.3 })
    const fill = path(container)?.getAttribute('fill') ?? ''
    const id = fill.match(/^url\(#(.+)\)$/)?.[1] ?? ''
    const gradient = container.querySelector(`[id="${id}"]`)
    expect(gradient?.tagName.toLowerCase()).toBe('lineargradient')
    const stops = gradient?.querySelectorAll('stop') ?? []
    expect(stops[0]).toHaveStyle({ stopColor: 'var(--ch-loss)', stopOpacity: '0.3' })
    expect(stops[1]).toHaveStyle({ stopOpacity: '0' })
    expect(path(container)).toHaveAttribute('data-ch-tone', 'loss')
  })

  it('breaks at missing values and draws nothing with fewer than two points', () => {
    const { container, unmount } = renderArea({}, [
      { k: 'a', v: 100 },
      { k: 'b', v: null },
      { k: 'c', v: 0 },
    ])
    expect(path(container)).toBeNull()
    unmount()
    const single = renderArea({}, [{ k: 'a', v: 10 }])
    expect(path(single.container)).toBeNull()
  })

  it('breaks into one shape per run at a missing value', () => {
    const { container } = renderArea({}, [
      { k: 'a', v: 100 },
      { k: 'b', v: 50 },
      { k: 'c', v: null },
      { k: 'd', v: 0 },
      { k: 'e', v: 20 },
    ])
    // 60px bands: a, b | d, e.
    expect(path(container)).toHaveAttribute(
      'd',
      'M30,0L90,50L90,100L30,100ZM210,100L270,80L270,100L210,100Z',
    )
  })

  it('does not join a pair of bands across a missing value when filling the gaps', () => {
    const { container } = render(
      <Chart<Row>
        title="Test chart"
        data={[
          { k: 'a', v: 100 },
          { k: 'b', v: 50 },
          { k: 'c', v: null },
          { k: 'd', v: 0 },
        ]}
        width={400}
        height={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        x={{ type: 'band', field: 'k', padding: 0.5 }}
        y={{ field: 'v', domain: [0, 100] }}
        animate={false}
      >
        <Area<Row> between />
      </Chart>,
    )
    // Only the a–b gap: the pairs b–c and c–d each touch the missing value.
    expect(path(container)?.getAttribute('d')?.match(/M/g)).toHaveLength(1)
    expect(path(container)).toHaveAttribute('d', 'M57.14,0L114.29,50L114.29,100L57.14,100Z')
  })

  it('warns and draws nothing without a band x and a linear y', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <Chart
        title="Test chart"
        data={rows}
        width={300}
        x={{ field: 'v', domain: [0, 1] }}
        y={{ field: 'v', domain: [0, 1] }}
      >
        <Area<Row> />
      </Chart>,
    )
    expect(path(container)).toBeNull()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Area needs'))
  })
})
