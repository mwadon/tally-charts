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

  it('skips missing values and draws nothing with fewer than two points', () => {
    const { container, unmount } = renderArea({}, [
      { k: 'a', v: 100 },
      { k: 'b', v: null },
      { k: 'c', v: 0 },
    ])
    expect(path(container)).toHaveAttribute('d', 'M50,0L250,100L250,100L50,100Z')
    unmount()
    const single = renderArea({}, [{ k: 'a', v: 10 }])
    expect(path(single.container)).toBeNull()
  })

  it('warns and draws nothing without a band x and a linear y', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <Chart
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
