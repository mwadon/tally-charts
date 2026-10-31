import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Chart, type ChartProps } from '../Chart'
import { Tooltip } from '../overlays/Tooltip'
import { Bars, type BarsProps } from './Bars'

type Week = { week: string; margin: number | null }
const weeks: Week[] = [
  { week: 'W1', margin: 10 },
  { week: 'W2', margin: 20 },
]

function renderBars(props: BarsProps<Week> = {}, chart: Partial<ChartProps<Week>> = {}) {
  return render(
    <Chart<Week>
      title="Bars"
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

const bars = (root: HTMLElement) => [...root.querySelectorAll<SVGElement>('[data-ch-part="bar"]')]
const hits = (root: HTMLElement) => [...root.querySelectorAll('[data-ch-part="bar-hit"]')]

describe('<Bars>', () => {
  afterEach(() => vi.restoreAllMocks())

  it('fades negative bars toward their baseline', () => {
    const { container } = renderBars(
      { fill: 'hatch-fade' },
      { data: [{ week: 'W1', margin: -10 }], y: { field: 'margin', domain: [-20, 20] } },
    )
    const style = (bars(container)[0] as SVGElement).getAttribute('style') ?? ''
    expect(style).toMatch(/fade-down/)
  })

  it('uses the chart radius unless radius is set', () => {
    const { container, unmount } = renderBars()
    expect(bars(container)[0]).toHaveAttribute('rx', '3')
    unmount()
    const square = renderBars({ radius: 0 })
    expect(bars(square.container)[0]).toHaveAttribute('rx', '0')
  })

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

  it('mentions Enter in the chart description only on selectable bars', () => {
    const enter = 'Press Enter to select'
    const { container, unmount } = renderBars(
      { selectable: (_, i) => i !== 1 },
      { onSelect: () => {} },
    )
    const chart = screen.getByRole('application')
    expect(chart).toHaveAccessibleDescription(expect.stringContaining(enter))
    act(() => chart.focus())
    expect(chart).toHaveAccessibleDescription(expect.stringContaining(enter))
    fireEvent.keyDown(chart, { key: 'ArrowRight' })
    expect(chart).not.toHaveAccessibleDescription(expect.stringContaining(enter))
    expect(container.querySelector('[aria-live]')?.textContent).not.toContain('Enter')
    fireEvent.keyDown(chart, { key: 'ArrowLeft' })
    expect(chart).toHaveAccessibleDescription(expect.stringContaining(enter))
    unmount()
    // Without onSelect no bar can be selected.
    const plain = renderBars({ selectable: (_, i) => i !== 1 })
    const plainChart = screen.getByRole('application')
    act(() => plainChart.focus())
    expect(plainChart).not.toHaveAccessibleDescription(expect.stringContaining(enter))
    fireEvent.keyDown(plainChart, { key: 'ArrowRight' })
    expect(plainChart).not.toHaveAccessibleDescription(expect.stringContaining(enter))
    fireEvent.keyDown(plainChart, { key: 'ArrowLeft' })
    expect(plainChart).not.toHaveAccessibleDescription(expect.stringContaining(enter))
    expect(plain.container.querySelector('[aria-live]')?.textContent).not.toContain('Enter')
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
    expect(a).toHaveAttribute('data-ch-direction', 'down')
    expect(a).toHaveAttribute('y', '60')
    expect(a).toHaveAttribute('height', '60')
    expect(b).toHaveAttribute('data-ch-direction', 'up')
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
    expect(a).toHaveAttribute('data-ch-direction', 'right')
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

  it('selects the clicked bar even when another bar was active', () => {
    const onSelect = vi.fn()
    const { container } = renderBars({}, { onSelect })
    fireEvent.pointerEnter(hits(container)[0] as Element)
    fireEvent.click(hits(container)[1] as Element)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0]?.[0]).toBe(1)
    expect(onSelect.mock.calls[0]?.[1]).toMatchObject({ id: 1, index: 1 })
  })

  it('selects on a click with nothing active, as a touch tap does', () => {
    const onSelect = vi.fn()
    const { container } = renderBars({}, { onSelect })
    fireEvent.click(hits(container)[0] as Element)
    expect(onSelect).toHaveBeenCalledWith(0, expect.objectContaining({ id: 0 }))
  })

  it('ignores clicks on the figure outside the bars', () => {
    const onSelect = vi.fn()
    const { container } = renderBars({}, { onSelect })
    fireEvent.pointerEnter(hits(container)[1] as Element)
    fireEvent.click(container.querySelector('figure') as Element)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('marks hit areas as selectable only when the chart has onSelect', () => {
    const { container, unmount } = renderBars()
    expect(hits(container)[0]).not.toHaveAttribute('data-ch-selectable')
    unmount()
    const selectable = renderBars({}, { onSelect: () => {} })
    expect(hits(selectable.container)[0]).toHaveAttribute('data-ch-selectable', 'true')
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
    fireEvent.keyDown(screen.getByRole('application'), { key: 'ArrowRight' })
    expect(container.querySelector('[aria-live]')).toHaveTextContent('W1, 10.0%')
  })

  it('uses a label accessor for announcements', () => {
    const { container } = renderBars({ label: (d) => `Week of ${d.week}` })
    fireEvent.keyDown(screen.getByRole('application'), { key: 'End' })
    expect(container.querySelector('[aria-live]')).toHaveTextContent('Week of W2, 20')
  })

  it('draws thinner bars inside the band', () => {
    const { container } = renderBars({ size: 20 })
    expect(bars(container)[0]).toHaveAttribute('x', '40')
    expect(bars(container)[0]).toHaveAttribute('width', '20')
  })

  it('runs a bar from a start value', () => {
    const { container } = renderBars({ from: () => 5 })
    // y domain [0, 20] over 120px: 5 → 90, 10 → 60.
    expect(bars(container)[0]).toHaveAttribute('y', '60')
    expect(bars(container)[0]).toHaveAttribute('height', '30')
  })

  it('draws a track behind each bar across the value range', () => {
    const { container } = renderBars({ track: true })
    const tracks = [...container.querySelectorAll('[data-ch-part="bar-track"]')]
    expect(tracks).toHaveLength(2)
    expect(tracks[0]).toHaveAttribute('y', '0')
    expect(tracks[0]).toHaveAttribute('height', '120')
  })

  it('registers nothing and draws no hit areas when not interactive', () => {
    const onActiveChange = vi.fn()
    const { container } = renderBars({ interactive: false }, { onActiveChange })
    expect(hits(container)).toHaveLength(0)
    // No points, so no keyboard widget: the plot is not focusable and ignores keys.
    expect(container.querySelector('[role="application"]')).toBeNull()
    fireEvent.keyDown(container.querySelector('[data-ch-part="plot"]') as Element, {
      key: 'ArrowRight',
    })
    expect(onActiveChange).not.toHaveBeenCalled()
  })

  it('announces ariaLabel text', () => {
    const { container } = renderBars({ ariaLabel: (d) => `Week ${d.week}` })
    fireEvent.keyDown(container.querySelector('[role="application"]') as Element, {
      key: 'ArrowRight',
    })
    expect(container.querySelector('[aria-live]')).toHaveTextContent('Week W1')
  })

  it('stretches hit areas over the chart margins', () => {
    const { container } = renderBars({}, { margin: { top: 10, right: 0, bottom: 20, left: 0 } })
    expect(hits(container)[0]).toHaveAttribute('y', '-10')
    expect(hits(container)[0]).toHaveAttribute('height', '120')
  })

  it('builds the tooltip pill from `segments`', () => {
    const { container } = render(
      <Chart<Week>
        title="Bars"
        data={weeks}
        width={200}
        height={120}
        x={{ type: 'band', field: 'week', padding: 0 }}
        y={{ field: 'margin', domain: [0, 20] }}
        activeId={1}
      >
        <Bars<Week> segments={(d) => [{ value: d.week }, { value: 'custom' }]} />
        <Tooltip />
      </Chart>,
    )
    expect(container.querySelector('[data-ch-part="tooltip"]')).toHaveTextContent('W2custom')
  })

  describe('color', () => {
    it('paints solid bars, constant or per item, and follows the prop', () => {
      const { container, rerender } = renderBars({ fill: 'solid', color: '#fc0' })
      expect(bars(container).map((b) => b.style.fill)).toEqual([
        'rgb(255, 204, 0)',
        'rgb(255, 204, 0)',
      ])
      expect(bars(container)[0]).toHaveAttribute('data-ch-tone', 'accent')
      expect(bars(container)[0]).toHaveAttribute('data-ch-colored', 'true')
      const perItem = (d: Week) => (d.week === 'W2' ? 'var(--gold)' : 'var(--other)')
      const chart = (color: BarsProps<Week>['color']) => (
        <Chart<Week>
          title="Bars"
          data={weeks}
          width={200}
          height={120}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          x={{ type: 'band', field: 'week', padding: 0 }}
          y={{ field: 'margin', domain: [0, 20] }}
          animate={false}
        >
          <Bars<Week> color={color} />
        </Chart>
      )
      rerender(chart(perItem))
      expect(bars(container).map((b) => b.style.fill)).toEqual(['var(--other)', 'var(--gold)'])
      rerender(chart('#00f'))
      expect(bars(container).map((b) => b.style.fill)).toEqual(['rgb(0, 0, 255)', 'rgb(0, 0, 255)'])
    })

    it('keeps the tone pattern on hatched bars and warns once', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { container } = renderBars({ fill: 'hatch', color: '#fc0' })
      for (const b of bars(container)) {
        expect(b.style.fill).toMatch(/^url\(/)
        expect(b).not.toHaveAttribute('data-ch-colored')
      }
      expect(warn).toHaveBeenCalledTimes(1)
      expect(String(warn.mock.calls[0]?.[0])).toContain('Bars `color` only applies')
    })

    it('draws the same markup as before without color', () => {
      const { container } = renderBars({})
      const bar = bars(container)[0]
      expect(bar).not.toHaveAttribute('data-ch-colored')
      expect(bar?.style.fill).toBe('var(--ch-accent)')
      expect(bar?.style.getPropertyValue('--_ch-swatch-color')).toBe('var(--ch-accent)')
    })
  })
})
