import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Id } from '../core/types'
import { Chart } from './Chart'
import { type ChartContextValue, useChart } from './context'
import { useRegisterPoints } from './useRegisterPoints'

const weeks = [
  { week: 'W1', margin: 30 },
  { week: 'W2', margin: 34 },
]

function Probe({ onContext }: { onContext: (ctx: ChartContextValue) => void }) {
  onContext(useChart('Probe'))
  return null
}

function PointsProbe({ ids }: { ids: Id[] }) {
  const ctx = useChart('PointsProbe')
  useRegisterPoints(
    ctx,
    ids.map((id, index) => ({
      id,
      index,
      datum: null,
      x: index,
      y: 0,
      label: `Week ${id}`,
      segments: [],
    })),
  )
  return null
}

describe('<Chart>', () => {
  it('uses chartId as the pattern id prefix', () => {
    const { container } = render(<Chart width={100} chartId="revenue" />)
    expect(container.querySelector('#ch-revenue-hatch-accent')).not.toBeNull()
  })

  it('exposes the default corner radius through context', () => {
    let ctx: ChartContextValue | undefined
    render(
      <Chart width={100}>
        <Probe
          onContext={(c) => {
            ctx = c
          }}
        />
      </Chart>,
    )
    expect(ctx?.radius).toBe(3)
  })

  it('renders a named, described figure that is one tab stop', () => {
    render(
      <Chart
        data={weeks}
        width={400}
        title="Margin by week"
        description="Under target for 12 weeks."
      >
        {null}
      </Chart>,
    )
    const figure = screen.getByRole('figure', { name: 'Margin by week' })
    expect(figure).toHaveAccessibleDescription('Under target for 12 weeks.')
    expect(figure).toHaveAttribute('tabindex', '0')
  })

  it('sizes the svg from width and height, or from aspectRatio', () => {
    const { container, rerender } = render(<Chart width={400} height={180} />)
    expect(container.querySelector('svg')).toHaveAttribute('height', '180')
    rerender(<Chart width={400} aspectRatio={2} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '400')
    expect(svg).toHaveAttribute('height', '200')
  })

  it('exposes inner size and scales through context', () => {
    let ctx: ChartContextValue | undefined
    render(
      <Chart
        data={weeks}
        width={400}
        height={230}
        margin={{ top: 10, bottom: 20 }}
        x={{ type: 'band', field: 'week' }}
        y={{ field: 'margin', domain: [0, 40] }}
      >
        <Probe
          onContext={(c) => {
            ctx = c
          }}
        />
      </Chart>,
    )
    expect(ctx?.innerWidth).toBe(400)
    expect(ctx?.innerHeight).toBe(200)
    expect(ctx?.x.kind).toBe('band')
    expect(ctx?.y.kind).toBe('linear')
    expect(ctx?.data).toBe(weeks)
    expect(ctx?.format('percent')(34)).toBe('34.0%')
  })

  it('renders the empty slot instead of the plot for empty data', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <Chart data={[]} width={300} empty="Nothing yet" x={{ type: 'band' }} />,
    )
    expect(screen.getByText('Nothing yet')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
    expect(screen.getByRole('figure')).not.toHaveAttribute('tabindex')
    expect(warn).not.toHaveBeenCalled()
  })

  it('throws when a building block is rendered outside <Chart>', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe onContext={() => {}} />)).toThrow(
      '[tally-charts] <Probe> must be rendered inside <Chart>.',
    )
  })

  it('scopes pattern ids per chart', () => {
    const { container } = render(
      <>
        <Chart width={200} />
        <Chart width={200} />
      </>,
    )
    const ids = [...container.querySelectorAll('pattern, mask')].map((el) => el.id)
    expect(ids).toHaveLength(20)
    expect(new Set(ids).size).toBe(20)
  })

  it('keeps geometry finite at zero width', () => {
    let ctx: ChartContextValue | undefined
    const { container } = render(
      <Chart width={0} height={0} x={{ type: 'band', domain: ['a'] }} y={{ domain: [0, 1] }}>
        <Probe
          onContext={(c) => {
            ctx = c
          }}
        />
      </Chart>,
    )
    expect(ctx?.innerWidth).toBe(0)
    expect(ctx?.innerHeight).toBe(0)
    expect(container.querySelector('svg')).toHaveAttribute('width', '0')
  })

  it('moves the active point with the keyboard and announces it', () => {
    const onActiveChange = vi.fn()
    const { container } = render(
      <Chart width={300} onActiveChange={onActiveChange}>
        <PointsProbe ids={[1, 2, 3]} />
      </Chart>,
    )
    const figure = screen.getByRole('figure')
    const live = container.querySelector('[aria-live]')
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(onActiveChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ label: 'Week 1' }))
    expect(live).toHaveTextContent('Week 1')
    fireEvent.keyDown(figure, { key: 'End' })
    expect(live).toHaveTextContent('Week 3')
    fireEvent.keyDown(figure, { key: 'Escape' })
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
    expect(live?.textContent).toBe('')
  })

  it('calls onSelect with the active point on Enter', () => {
    const onSelect = vi.fn()
    render(
      <Chart width={300} onSelect={onSelect}>
        <PointsProbe ids={['a', 'b']} />
      </Chart>,
    )
    const figure = screen.getByRole('figure')
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    fireEvent.keyDown(figure, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('a', expect.objectContaining({ id: 'a' }))
  })

  it('clears pointer activation when the pointer leaves', () => {
    const onActiveChange = vi.fn()
    let ctx: ChartContextValue | undefined
    render(
      <Chart width={300} onActiveChange={onActiveChange}>
        <PointsProbe ids={[1, 2]} />
        <Probe
          onContext={(c) => {
            ctx = c
          }}
        />
      </Chart>,
    )
    act(() => ctx?.setActive(2, 'pointer'))
    expect(onActiveChange).toHaveBeenLastCalledWith(2, expect.objectContaining({ id: 2 }))
    fireEvent.pointerLeave(screen.getByRole('figure'))
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
  })

  it('reports a null active id when the controlled id is not among the registered points', () => {
    let ctx: ChartContextValue | undefined
    const { container } = render(
      <Chart width={300} activeId={99}>
        <PointsProbe ids={[1, 2]} />
        <Probe
          onContext={(c) => {
            ctx = c
          }}
        />
      </Chart>,
    )
    expect(ctx?.activeId).toBeNull()
    expect(ctx?.activePoint).toBeNull()
    expect(container.querySelector('[aria-live]')?.textContent).toBe('')
  })

  it('navigates past ids registered by two marks', () => {
    const onActiveChange = vi.fn()
    render(
      <Chart width={300} onActiveChange={onActiveChange}>
        <PointsProbe ids={['a', 'b']} />
        <PointsProbe ids={['a', 'b']} />
      </Chart>,
    )
    const figure = screen.getByRole('figure')
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(onActiveChange.mock.calls.map((call) => call[0])).toEqual(['a', 'b'])
  })

  it('renders a hidden data table captioned with the title', () => {
    render(
      <Chart
        data={weeks}
        width={300}
        title="Margin by week"
        dataTable={{ columns: [{ header: 'Week', value: (d) => d.week }] }}
      />,
    )
    const table = screen.getByRole('table', { name: 'Margin by week' })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
  })

  it('renders no data table for empty data', () => {
    render(
      <Chart<{ week: string }>
        data={[]}
        width={300}
        dataTable={{ columns: [{ header: 'Week', value: (d) => d.week }] }}
      />,
    )
    expect(screen.queryByRole('table')).toBeNull()
  })
})
