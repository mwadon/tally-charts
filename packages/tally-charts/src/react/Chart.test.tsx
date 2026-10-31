import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import type { Id } from '../core/types'
import { Chart } from './Chart'
import { BarChart } from './charts/BarChart'
import {
  type ChartContextValue,
  type InternalChartContext,
  useChart,
  useChartContext,
} from './context'
import { useRegisterPoints } from './useRegisterPoints'

const weeks = [
  { week: 'W1', margin: 30 },
  { week: 'W2', margin: 34 },
]

function Probe({ onContext }: { onContext: (ctx: InternalChartContext) => void }) {
  onContext(useChartContext('Probe'))
  return null
}

function PointsProbe({ ids, unselectable = [] }: { ids: Id[]; unselectable?: Id[] }) {
  useRegisterPoints(
    ids.map((id, index) => ({
      id,
      index,
      datum: null,
      x: index,
      y: 0,
      label: `Week ${id}`,
      segments: [],
      ...(unselectable.includes(id) ? { selectable: false } : {}),
    })),
  )
  return null
}

describe('<Chart>', () => {
  it('uses chartId as the pattern id prefix', () => {
    const { container } = render(<Chart title="Test chart" width={100} chartId="revenue" />)
    expect(container.querySelector('#ch-revenue-hatch-accent')).not.toBeNull()
  })

  it('exposes the default corner radius through context', () => {
    let ctx: InternalChartContext | undefined
    render(
      <Chart title="Test chart" width={100}>
        <Probe
          onContext={(c) => {
            ctx = c
          }}
        />
      </Chart>,
    )
    expect(ctx?.radius).toBe(3)
  })

  it('renders a named, described figure with one tab stop inside: the chart widget', () => {
    render(
      <Chart
        data={weeks}
        width={400}
        title="Margin by week"
        description="Under target for 12 weeks."
        dataTable={{ columns: [{ header: 'Week', value: (d) => d.week }] }}
      >
        <PointsProbe ids={[1, 2]} />
      </Chart>,
    )
    // (Named `fig`, not `figure`: Step 4's sed rewrites `const figure = …` lines.)
    const fig = screen.getByRole('figure', { name: 'Margin by week' })
    expect(fig).toHaveAccessibleDescription('Under target for 12 weeks.')
    expect(fig).not.toHaveAttribute('tabindex')
    const chart = within(fig).getByRole('application', { name: 'Margin by week' })
    expect(chart).toHaveAttribute('aria-roledescription', 'chart')
    expect(chart).toHaveAttribute('tabindex', '0')
    expect(chart).toHaveAccessibleDescription(
      'Under target for 12 weeks. Use arrow keys to move between points, Home and End for first and last, Escape to clear.',
    )
    // The data table and the live region stay outside the widget, where browse mode reads them.
    expect(chart.querySelector('[aria-live]')).toBeNull()
    const table = within(fig).getByRole('table', { name: 'Margin by week' })
    expect(chart).not.toContainElement(table)
    expect(fig).toContainElement(table)
    expect(chart.closest('[role="application"]')).toBe(chart)
    expect(table.closest('[role="application"]')).toBeNull()
  })

  it('adds Enter to the hint with onSelect, takes a custom hint, and drops an empty one', () => {
    const { rerender } = render(
      <Chart width={400} title="Probe" onSelect={() => {}}>
        <PointsProbe ids={[1]} />
      </Chart>,
    )
    expect(screen.getByRole('application')).toHaveAccessibleDescription(
      'Use arrow keys to move between points, Home and End for first and last, Escape to clear. Press Enter to select.',
    )
    rerender(
      <Chart width={400} title="Probe" keyboardHint="Flèches pour se déplacer.">
        <PointsProbe ids={[1]} />
      </Chart>,
    )
    expect(screen.getByRole('application')).toHaveAccessibleDescription('Flèches pour se déplacer.')
    rerender(
      <Chart width={400} title="Probe" keyboardHint="">
        <PointsProbe ids={[1]} />
      </Chart>,
    )
    expect(screen.getByRole('application')).not.toHaveAttribute('aria-describedby')
    rerender(
      <Chart width={400} title="Probe" description="About it." keyboardHint="">
        <PointsProbe ids={[1]} />
      </Chart>,
    )
    const app = screen.getByRole('application')
    const descId = screen.getByRole('figure').getAttribute('aria-describedby')
    expect(descId).toBeTruthy()
    expect(app.getAttribute('aria-describedby')).toBe(descId)
    expect(app).toHaveAccessibleDescription('About it.')
  })

  describe('Enter hint', () => {
    const enter = 'Press Enter to select'
    const live = (root: HTMLElement) => root.querySelector('[aria-live]')

    it('is absent without onSelect, in the description and the live region', () => {
      const { container } = render(
        <Chart width={400} title="Probe">
          <PointsProbe ids={[1, 2, 3]} />
        </Chart>,
      )
      const chart = screen.getByRole('application')
      expect(chart).not.toHaveAccessibleDescription(expect.stringContaining(enter))
      fireEvent.keyDown(chart, { key: 'ArrowRight' })
      fireEvent.keyDown(chart, { key: 'End' })
      expect(live(container)?.textContent).toBeTruthy()
      expect(live(container)?.textContent).not.toContain('Enter')
      expect(chart).not.toHaveAccessibleDescription(expect.stringContaining(enter))
    })

    it('is absent while the first point cannot be selected, before and after focus', () => {
      const { container } = render(
        <Chart width={400} title="Probe" onSelect={() => {}}>
          <PointsProbe ids={[1, 2]} unselectable={[1]} />
        </Chart>,
      )
      const chart = screen.getByRole('application')
      expect(chart).not.toHaveAccessibleDescription(expect.stringContaining(enter))
      act(() => chart.focus())
      expect(chart).not.toHaveAccessibleDescription(expect.stringContaining(enter))
      expect(live(container)?.textContent).not.toContain('Enter')
    })

    it('follows the active point between selectable and unselectable points', () => {
      const { container } = render(
        <Chart width={400} title="Probe" onSelect={() => {}}>
          <PointsProbe ids={[1, 2, 3]} unselectable={[2]} />
        </Chart>,
      )
      const chart = screen.getByRole('application')
      const hint = `${enter}.`
      expect(chart).toHaveAccessibleDescription(expect.stringContaining(hint))
      act(() => chart.focus())
      expect(chart).toHaveAccessibleDescription(expect.stringContaining(hint))
      expect(live(container)?.textContent).not.toContain('Enter')
      fireEvent.keyDown(chart, { key: 'ArrowRight' })
      expect(chart).not.toHaveAccessibleDescription(expect.stringContaining(enter))
      expect(live(container)?.textContent).not.toContain('Enter')
      fireEvent.keyDown(chart, { key: 'ArrowRight' })
      expect(chart).toHaveAccessibleDescription(expect.stringContaining(hint))
      expect(live(container)?.textContent).not.toContain('Enter')
    })

    it('uses a custom keyboardHint as is, whatever the point', () => {
      render(
        <Chart width={400} title="Probe" onSelect={() => {}} keyboardHint="Custom.">
          <PointsProbe ids={[1, 2]} unselectable={[1]} />
        </Chart>,
      )
      const chart = screen.getByRole('application')
      expect(chart).toHaveAccessibleDescription('Custom.')
      fireEvent.keyDown(chart, { key: 'ArrowRight' })
      expect(chart).toHaveAccessibleDescription('Custom.')
    })
  })

  it('leaves Alt, Ctrl and Cmd shortcuts to the browser', () => {
    render(
      <Chart width={400} title="Probe">
        <PointsProbe ids={[1, 2, 3]} />
      </Chart>,
    )
    const chart = screen.getByRole('application', { name: 'Probe' })
    fireEvent.keyDown(chart, { key: 'ArrowRight' })
    const active = chart.getAttribute('aria-activedescendant')
    for (const mod of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }]) {
      for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
        expect(fireEvent.keyDown(chart, { key, ...mod })).toBe(true)
      }
    }
    expect(chart.getAttribute('aria-activedescendant')).toBe(active)
    expect(fireEvent.keyDown(chart, { key: 'End' })).toBe(false)
  })

  it('is not focusable while no mark registers points', () => {
    const { container } = render(
      <Chart data={weeks} width={400} title="Lines only">
        {null}
      </Chart>,
    )
    expect(screen.queryByRole('application')).toBeNull()
    expect(container.querySelector('[tabindex]')).toBeNull()
    expect(container.querySelector('[data-ch-part="plot"] svg')).not.toBeNull()
  })

  it('sizes the svg from width and height, or from aspectRatio', () => {
    const { container, rerender } = render(<Chart title="Test chart" width={400} height={180} />)
    expect(container.querySelector('svg')).toHaveAttribute('height', '180')
    rerender(<Chart title="Test chart" width={400} aspectRatio={2} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '400')
    expect(svg).toHaveAttribute('height', '200')
  })

  it('exposes inner size and scales through context', () => {
    let ctx: InternalChartContext | undefined
    render(
      <Chart
        title="Test chart"
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
      <Chart data={[]} width={300} title="Empty" empty="Nothing yet" x={{ type: 'band' }} />,
    )
    expect(screen.getByText('Nothing yet')).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
    expect(container.querySelector('[tabindex]')).toBeNull()
    expect(warn).not.toHaveBeenCalled()
  })

  it('gives custom marks the public context through useChart()', () => {
    let ctx: ChartContextValue | undefined
    function Custom() {
      ctx = useChart()
      return null
    }
    render(
      <Chart
        title="Test chart"
        data={weeks}
        width={400}
        x={{ type: 'band', field: 'week' }}
        y={{ domain: [0, 40] }}
      >
        <Custom />
      </Chart>,
    )
    expect(ctx?.innerWidth).toBe(400)
    expect(ctx?.x.kind).toBe('band')
    expect(ctx?.format('percent')(34)).toBe('34.0%')
    expectTypeOf<keyof ChartContextValue>().toEqualTypeOf<
      | 'width'
      | 'height'
      | 'innerWidth'
      | 'innerHeight'
      | 'margin'
      | 'data'
      | 'x'
      | 'y'
      | 'y2'
      | 'format'
      | 'dimInactive'
      | 'activeId'
      | 'activePoint'
      | 'points'
      | 'setActive'
      | 'select'
      | 'selectable'
      | 'overlay'
    >()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Custom />)).toThrow(
      '[tally-charts] <useChart> must be rendered inside <Chart>.',
    )
  })

  it('registers points with useRegisterPoints(points) alone', () => {
    const onActiveChange = vi.fn()
    render(
      <Chart width={400} title="Probe" onActiveChange={onActiveChange}>
        <PointsProbe ids={['a', 'b']} />
      </Chart>,
    )
    fireEvent.keyDown(screen.getByRole('application', { name: 'Probe' }), { key: 'End' })
    expect(onActiveChange).toHaveBeenLastCalledWith(
      'b',
      expect.objectContaining({ label: 'Week b' }),
    )
  })

  it('warns once when the figure has no title, for <Chart> and every high-level chart', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const axes = { x: { domain: [0, 1] }, y: { domain: [0, 1] } } as const
    // @ts-expect-error a call from JS without a name
    const { rerender } = render(<Chart width={100} {...axes} />)
    // @ts-expect-error a call from JS without a name
    rerender(<Chart width={200} {...axes} />)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toBe(
      '[tally-charts] Chart has no `title`, so screen readers announce an unnamed figure.',
    )
    warn.mockClear()
    // @ts-expect-error a call from JS without a name
    render(<BarChart data={weeks} x="week" y="margin" width={300} />)
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockClear()
    render(<Chart width={100} title="Named" {...axes} />)
    expect(warn).not.toHaveBeenCalled()
  })

  it('takes its name from the element aria-labelledby points at, without a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <>
        <h2 id="ext">Weekly margin</h2>
        <Chart width={400} aria-labelledby="ext" x={{ domain: [0, 1] }} y={{ domain: [0, 1] }}>
          <PointsProbe ids={['a', 'b']} />
        </Chart>
      </>,
    )
    expect(screen.getByRole('application', { name: 'Weekly margin' })).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: 'Weekly margin' })).toBeInTheDocument()
    expect(warn).not.toHaveBeenCalled()
  })

  it('names the chart from aria-labelledby when it has a title too; the title stays the caption', () => {
    render(
      <>
        <h2 id="ext">Weekly margin</h2>
        <Chart
          width={400}
          title="Margin by week"
          aria-labelledby="ext"
          data={weeks}
          dataTable={{ columns: [{ header: 'Week', value: (d) => d.week }] }}
        >
          <PointsProbe ids={['a', 'b']} />
        </Chart>
      </>,
    )
    expect(screen.getByRole('application', { name: 'Weekly margin' })).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: 'Weekly margin' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Margin by week' })).toBeInTheDocument()
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
        <Chart title="Test chart" width={200} />
        <Chart title="Test chart" width={200} />
      </>,
    )
    const ids = [...container.querySelectorAll('pattern, mask')].map((el) => el.id)
    expect(ids).toHaveLength(20)
    expect(new Set(ids).size).toBe(20)
  })

  it('keeps geometry finite at zero width', () => {
    let ctx: InternalChartContext | undefined
    const { container } = render(
      <Chart
        title="Test chart"
        width={0}
        height={0}
        x={{ type: 'band', domain: ['a'] }}
        y={{ domain: [0, 1] }}
      >
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
      <Chart title="Test chart" width={300} onActiveChange={onActiveChange}>
        <PointsProbe ids={[1, 2, 3]} />
      </Chart>,
    )
    const chart = screen.getByRole('application')
    const live = container.querySelector('[aria-live]')
    fireEvent.keyDown(chart, { key: 'ArrowRight' })
    expect(onActiveChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ label: 'Week 1' }))
    expect(live?.textContent).toBe('1 of 3, Week 1')
    fireEvent.keyDown(chart, { key: 'End' })
    expect(live?.textContent).toBe('3 of 3, Week 3')
    fireEvent.keyDown(chart, { key: 'Escape' })
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
    expect(live?.textContent).toBe('')
  })

  it('activates and announces the first point when keyboard focus arrives', () => {
    const onActiveChange = vi.fn()
    const { container } = render(
      <Chart title="Test chart" width={300} onActiveChange={onActiveChange}>
        <PointsProbe ids={[1, 2, 3]} />
      </Chart>,
    )
    fireEvent.focus(screen.getByRole('application'))
    expect(onActiveChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ id: 1 }))
    expect(container.querySelector('[aria-live]')?.textContent).toBe('1 of 3, Week 1')
  })

  it('leaves the active point alone when a pointer press focuses the chart', () => {
    const onActiveChange = vi.fn()
    render(
      <Chart title="Test chart" width={300} onActiveChange={onActiveChange}>
        <PointsProbe ids={[1, 2]} />
      </Chart>,
    )
    const chart = screen.getByRole('application')
    fireEvent.pointerDown(chart)
    fireEvent.focus(chart)
    expect(onActiveChange).not.toHaveBeenCalled()
    // The next focus, by keyboard, activates again.
    fireEvent.blur(chart)
    fireEvent.focus(chart)
    expect(onActiveChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ id: 1 }))
  })

  it('activates the first point on keyboard focus after a press that moved no focus', () => {
    const onActiveChange = vi.fn()
    const { container } = render(
      <Chart title="Test chart" width={300} onActiveChange={onActiveChange}>
        <PointsProbe ids={[1, 2]} />
      </Chart>,
    )
    const chart = screen.getByRole('application')
    fireEvent.pointerDown(chart)
    fireEvent.focus(chart)
    fireEvent.pointerDown(chart)
    fireEvent.blur(chart)
    fireEvent.focus(chart)
    expect(onActiveChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ id: 1 }))
    expect(container.querySelector('[aria-live]')?.textContent).toBe('1 of 2, Week 1')
  })

  it('calls onSelect with the active point on Enter', () => {
    const onSelect = vi.fn()
    render(
      <Chart title="Test chart" width={300} onSelect={onSelect}>
        <PointsProbe ids={['a', 'b']} />
      </Chart>,
    )
    const chart = screen.getByRole('application')
    fireEvent.keyDown(chart, { key: 'ArrowRight' })
    fireEvent.keyDown(chart, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('a', expect.objectContaining({ id: 'a' }))
  })

  it('clears pointer activation when the pointer leaves', () => {
    const onActiveChange = vi.fn()
    let ctx: InternalChartContext | undefined
    render(
      <Chart title="Test chart" width={300} onActiveChange={onActiveChange}>
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

  it('closes a hover tooltip on Escape wherever focus is', () => {
    const onActiveChange = vi.fn()
    let ctx: InternalChartContext | undefined
    render(
      <Chart title="Test chart" width={300} onActiveChange={onActiveChange}>
        <PointsProbe ids={[1, 2]} />
        <Probe
          onContext={(c) => {
            ctx = c
          }}
        />
      </Chart>,
    )
    act(() => ctx?.setActive(2, 'pointer'))
    fireEvent.keyDown(document.body, { key: 'Enter' })
    expect(onActiveChange).toHaveBeenLastCalledWith(2, expect.objectContaining({ id: 2 }))
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
    // Nothing is listening once the tooltip is gone.
    onActiveChange.mockClear()
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onActiveChange).not.toHaveBeenCalled()
  })

  it('reports a null active id when the controlled id is not among the registered points', () => {
    let ctx: InternalChartContext | undefined
    const { container } = render(
      <Chart title="Test chart" width={300} activeId={99}>
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
      <Chart title="Test chart" width={300} onActiveChange={onActiveChange}>
        <PointsProbe ids={['a', 'b']} />
        <PointsProbe ids={['a', 'b']} />
      </Chart>,
    )
    const chart = screen.getByRole('application')
    fireEvent.keyDown(chart, { key: 'ArrowRight' })
    fireEvent.keyDown(chart, { key: 'ArrowRight' })
    fireEvent.keyDown(chart, { key: 'ArrowRight' })
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
        title="Test chart"
        data={[]}
        width={300}
        dataTable={{ columns: [{ header: 'Week', value: (d) => d.week }] }}
      />,
    )
    expect(screen.queryByRole('table')).toBeNull()
  })
})
