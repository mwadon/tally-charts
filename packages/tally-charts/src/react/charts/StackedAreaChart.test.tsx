import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ChartPoint } from '../types'
import { type AreaSeries, StackedAreaChart, type StackedAreaChartProps } from './StackedAreaChart'

// Records every points array a mark registers, so a test can see whether a re-render with the
// same props registers a new array. The real hook still runs.
const registered = vi.hoisted(() => [] as (readonly ChartPoint[])[])
vi.mock('../useRegisterPoints', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../useRegisterPoints')>()
  return {
    useRegisterPoints: (points: readonly ChartPoint[]) => {
      if (points.length > 0) registered.push(points)
      actual.useRegisterPoints(points)
    },
  }
})

type Week = {
  week: string
  install: number | null
  service: number | null
  warranty: number | null
}
const install = [180, 190, 200, 210, 205, 220, 235, 240, 250, 255, 262, 270]
const service = [120, 125, 118, 130, 140, 138, 145, 150, 155, 158, 162, 165]
const warranty = [60, 55, 65, 68, 62, 58, 66, 72, 70, 74, 76, 78]
// Totals: W1 360, W4 408, W9 475, W12 513.
const weeks: Week[] = install.map((v, i) => ({
  week: `W${i + 1}`,
  install: v,
  service: service[i] as number,
  warranty: warranty[i] as number,
}))
const three: AreaSeries<Week>[] = [
  { id: 'install', label: 'Install', value: 'install' },
  { id: 'service', label: 'Service', value: 'service' },
  { id: 'warranty', label: 'Warranty', value: 'warranty' },
]

// 600 × 600 with no margin over [0, 600]: week i (1-based) at x = 50i − 25, y = 600 − v.
const xOf = (week: number) => 50 * week - 25
const yOf = (v: number) => 600 - v

function renderChart(props: Partial<StackedAreaChartProps<Week>> = {}) {
  return render(
    <StackedAreaChart<Week>
      data={weeks}
      x="week"
      series={three}
      domain={[0, 600]}
      format={(v) => `${v} h`}
      width={600}
      height={600}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      title="Crew hours per week"
      animate={false}
      {...props}
    />,
  )
}

/** `weeks` with some values replaced. */
function patched(changes: Record<number, Partial<Week>>): Week[] {
  return weeks.map((w, i) => ({ ...w, ...changes[i + 1] }))
}

const parts = (root: HTMLElement, part: string) => [
  ...root.querySelectorAll(`[data-ch-part="${part}"]`),
]

type P = { x: number; y: number }

/** The points of a path's `d` (M and L commands; Z ignored). */
function pointsOf(el: Element | undefined): P[] {
  const d = el?.getAttribute('d') ?? ''
  return [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }))
}

/** A closed layer path split into its upper edge (left to right) and lower edge (left to right). */
function edgesOf(el: Element | undefined): { upper: P[]; lower: P[] } {
  const points = pointsOf(el)
  const half = points.length / 2
  return { upper: points.slice(0, half), lower: points.slice(half).reverse() }
}

/** Layer paths of a tone, optionally only those with a fill. */
function layers(root: HTMLElement, tone: string, fill?: 'solid' | 'hatch') {
  return parts(root, 'area-layer').filter(
    (el) =>
      el.getAttribute('data-ch-tone') === tone &&
      (fill === undefined || el.getAttribute('data-ch-fill') === fill),
  )
}

/** The value extent [from, to] of a layer path at a week, read off the path. */
function extentAt(el: Element | undefined, week: number): [number, number] | undefined {
  const { upper, lower } = edgesOf(el)
  const i = upper.findIndex((p) => p.x === xOf(week))
  if (i < 0) return undefined
  return [600 - (lower[i] as P).y, 600 - (upper[i] as P).y]
}

const xsOf = (el: Element | undefined) => edgesOf(el).upper.map((p) => p.x)
const weeksX = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => xOf(from + i))

describe('<StackedAreaChart> layers', () => {
  it('stacks one solid layer per series in the default tones', () => {
    const { container } = renderChart()
    const all = parts(container, 'area-layer')
    expect(all).toHaveLength(3)
    expect(all.map((el) => el.getAttribute('data-ch-tone'))).toEqual([
      'accent',
      'accent-soft',
      'warn',
    ])
    expect(all.every((el) => el.getAttribute('data-ch-fill') === 'solid')).toBe(true)
    const [a, b, c] = all
    expect(extentAt(a, 1)).toEqual([0, 180])
    expect(extentAt(b, 1)).toEqual([180, 300])
    expect(extentAt(c, 1)).toEqual([300, 360])
    expect(extentAt(a, 12)).toEqual([0, 270])
    expect(extentAt(b, 12)).toEqual([270, 435])
    expect(extentAt(c, 12)).toEqual([435, 513])
    expect(xsOf(a)).toEqual(weeksX(1, 12))
    // Solid fills paint the tone itself.
    expect((a as SVGElement).style.fill).toBe('var(--ch-accent)')
  })

  it('uses an explicit tone', () => {
    const { container } = renderChart({
      series: [three[0] as AreaSeries<Week>, { ...(three[1] as AreaSeries<Week>), tone: 'gain' }],
    })
    expect(parts(container, 'area-layer').map((el) => el.getAttribute('data-ch-tone'))).toEqual([
      'accent',
      'gain',
    ])
  })

  it('defaults the domain to zero and the largest total, rounded; `domain` wins', () => {
    const auto = renderChart({ domain: undefined })
    const top = auto.container.querySelector('[data-ch-part="axis"][data-ch-side="left"]')
    const ticks = [...(top?.querySelectorAll('[data-ch-part="axis-label"]') ?? [])].map((t) =>
      Number.parseFloat(t.textContent ?? ''),
    )
    expect(Math.min(...ticks)).toBe(0)
    expect(Math.max(...ticks)).toBeGreaterThanOrEqual(513)
    // The top of the stack at W12 sits inside the plot, at or below the top edge.
    const [, , c] = parts(auto.container, 'area-layer')
    expect(Math.min(...edgesOf(c).upper.map((p) => p.y))).toBeGreaterThanOrEqual(0)
    auto.unmount()

    const fixed = renderChart({ domain: [0, 800], height: 800 })
    // 800 px over [0, 800]: y = 800 − v.
    const [a] = parts(fixed.container, 'area-layer')
    expect(edgesOf(a).upper[0]).toEqual({ x: 25, y: 800 - 180 })
  })

  it('separates neighbouring layers with surface lines along their boundaries', () => {
    const { container } = renderChart()
    const lines = parts(container, 'area-separator')
    expect(lines).toHaveLength(2)
    expect(pointsOf(lines[0])).toEqual(
      weeks.map((w, i) => ({ x: xOf(i + 1), y: yOf(w.install as number) })),
    )
    expect(pointsOf(lines[1])).toEqual(
      weeks.map((w, i) => ({
        x: xOf(i + 1),
        y: yOf((w.install as number) + (w.service as number)),
      })),
    )
  })

  it('keeps a zero-value layer continuous with zero thickness there', () => {
    const { container } = renderChart({ data: patched({ 5: { service: 0 } }) })
    const middle = layers(container, 'accent-soft')
    expect(middle).toHaveLength(1)
    expect(xsOf(middle[0])).toEqual(weeksX(1, 12))
    expect(extentAt(middle[0], 5)).toEqual([205, 205])
    expect(extentAt(layers(container, 'warn')[0], 5)).toEqual([205, 267])
  })
})

describe('<StackedAreaChart> forecast part', () => {
  it('hatches every layer from the x before `forecastFrom`, with edges, a rule and a label', () => {
    const { container } = renderChart({ forecastFrom: 'W10', forecastLabel: 'today' })
    for (const tone of ['accent', 'accent-soft', 'warn']) {
      const solid = layers(container, tone, 'solid')
      const hatch = layers(container, tone, 'hatch')
      expect(solid).toHaveLength(1)
      expect(hatch).toHaveLength(1)
      expect(xsOf(solid[0])).toEqual(weeksX(1, 9))
      expect(xsOf(hatch[0])).toEqual(weeksX(9, 12))
      expect((hatch[0] as SVGElement).style.fill).toMatch(
        new RegExp(`url\\("?#.*-hatch-${tone}"?\\)`),
      )
    }
    const edges = parts(container, 'area-edge')
    expect(edges).toHaveLength(3)
    expect(edges.map((e) => e.getAttribute('data-ch-tone'))).toEqual([
      'accent',
      'accent-soft',
      'warn',
    ])
    // The top layer's edge follows the total from W9 to W12.
    expect(pointsOf(edges[2])).toEqual([
      { x: xOf(9), y: yOf(475) },
      { x: xOf(10), y: yOf(255 + 158 + 74) },
      { x: xOf(11), y: yOf(262 + 162 + 76) },
      { x: xOf(12), y: yOf(513) },
    ])
    // Separators only run through the solid part.
    for (const line of parts(container, 'area-separator')) {
      expect(pointsOf(line).map((p) => p.x)).toEqual(weeksX(1, 9))
    }
    const rule = parts(container, 'forecast-rule')
    expect(rule).toHaveLength(1)
    expect(rule[0]).toHaveAttribute('x1', String(xOf(9)))
    expect(rule[0]).toHaveAttribute('x2', String(xOf(9)))
    expect(rule[0]).toHaveAttribute('y1', '0')
    expect(rule[0]).toHaveAttribute('y2', '600')
    const label = parts(container, 'forecast-label')
    expect(label).toHaveLength(1)
    expect(label[0]).toHaveTextContent('today')
    expect(label[0]).toHaveAttribute('x', String(xOf(9)))
    expect(label[0]).toHaveAttribute('y', '-6')
    expect(label[0]).toHaveAttribute('text-anchor', 'middle')
  })

  it('draws no label without `forecastLabel`', () => {
    const { container } = renderChart({ forecastFrom: 'W10' })
    expect(parts(container, 'forecast-rule')).toHaveLength(1)
    expect(parts(container, 'forecast-label')).toHaveLength(0)
  })

  it('keeps the label inside the svg near the edge', () => {
    const { container } = renderChart({
      forecastFrom: 'W2',
      forecastLabel: 'booked from here on',
    })
    const label = parts(container, 'forecast-label')[0]
    // Half of the estimated width (19 characters × 6.5 px) from the left edge, not centred on W1
    // at 25.
    expect(label).toHaveAttribute('x', '61.75')
  })

  it('hatches nothing and draws no rule when `forecastFrom` is the first x', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderChart({ forecastFrom: 'W1', forecastLabel: 'today' })
    expect(layers(container, 'accent', 'hatch')).toHaveLength(0)
    expect(parts(container, 'area-layer')).toHaveLength(3)
    expect(parts(container, 'forecast-rule')).toHaveLength(0)
    expect(parts(container, 'forecast-label')).toHaveLength(0)
    expect(parts(container, 'area-edge')).toHaveLength(0)
    expect(warn).not.toHaveBeenCalled()
  })

  it('hatches only the last interval when `forecastFrom` is the last x', () => {
    const { container } = renderChart({ forecastFrom: 'W12' })
    const hatch = layers(container, 'accent', 'hatch')
    expect(hatch).toHaveLength(1)
    expect(xsOf(hatch[0])).toEqual(weeksX(11, 12))
    expect(xsOf(layers(container, 'accent', 'solid')[0])).toEqual(weeksX(1, 11))
    expect(parts(container, 'forecast-rule')[0]).toHaveAttribute('x1', String(xOf(11)))
  })

  it('warns once and hatches nothing when `forecastFrom` is not on the axis', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container, rerender } = renderChart({ forecastFrom: 'W99', forecastLabel: 'today' })
    rerender(
      <StackedAreaChart<Week>
        data={weeks}
        x="week"
        series={three}
        domain={[0, 600]}
        width={600}
        height={600}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        title="Crew hours per week"
        animate={false}
        forecastFrom="W99"
        forecastLabel="today"
      />,
    )
    expect(layers(container, 'accent', 'hatch')).toHaveLength(0)
    expect(parts(container, 'forecast-rule')).toHaveLength(0)
    expect(parts(container, 'forecast-label')).toHaveLength(0)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toMatch(/^\[tally-charts\] .*"W99"/)
  })

  it('breaks the hatched layers at a missing value inside the forecast part', () => {
    const { container } = renderChart({
      data: patched({ 11: { service: null } }),
      forecastFrom: 'W10',
    })
    for (const tone of ['accent', 'accent-soft', 'warn']) {
      const hatch = layers(container, tone, 'hatch')
      // W12 alone draws nothing.
      expect(hatch).toHaveLength(1)
      expect(xsOf(hatch[0])).toEqual(weeksX(9, 10))
    }
    const edges = parts(container, 'area-edge')
    expect(edges).toHaveLength(3)
    for (const edge of edges) expect(pointsOf(edge).map((p) => p.x)).toEqual(weeksX(9, 10))
  })

  it('rules the top of a solid accent-soft layer and no other solid layer', () => {
    const two = renderChart({ series: three.slice(0, 2) })
    const edges = parts(two.container, 'area-edge')
    expect(edges).toHaveLength(1)
    expect(edges[0]).toHaveAttribute('data-ch-tone', 'accent-soft')
    expect(pointsOf(edges[0])).toEqual(
      weeks.map((w, i) => ({
        x: xOf(i + 1),
        y: yOf((w.install as number) + (w.service as number)),
      })),
    )
    two.unmount()
    const all = renderChart()
    expect(parts(all.container, 'area-edge')).toHaveLength(0)
  })

  it('rules a solid accent-soft top up to the split, and every hatched layer after it', () => {
    const { container } = renderChart({ series: three.slice(0, 2), forecastFrom: 'W10' })
    const edges = parts(container, 'area-edge')
    expect(edges.map((e) => pointsOf(e).map((p) => p.x))).toEqual([
      weeksX(9, 12),
      weeksX(9, 12),
      weeksX(1, 9),
    ])
  })
})

describe('<StackedAreaChart> missing and negative values', () => {
  it('breaks every layer at a row with a missing value', () => {
    const { container } = renderChart({ data: patched({ 5: { service: null } }) })
    for (const tone of ['accent', 'accent-soft', 'warn']) {
      const solid = layers(container, tone)
      expect(solid).toHaveLength(2)
      expect(xsOf(solid[0])).toEqual(weeksX(1, 4))
      expect(xsOf(solid[1])).toEqual(weeksX(6, 12))
    }
    for (const el of [...parts(container, 'area-layer'), ...parts(container, 'area-separator')]) {
      expect(pointsOf(el).some((p) => p.x === xOf(5))).toBe(false)
    }
  })

  it('draws nothing for a lone row between two breaks', () => {
    const { container } = renderChart({
      data: patched({ 5: { service: null }, 7: { warranty: null } }),
    })
    for (const tone of ['accent', 'accent-soft', 'warn']) {
      const solid = layers(container, tone)
      expect(solid.map(xsOf)).toEqual([weeksX(1, 4), weeksX(8, 12)])
    }
    for (const el of parts(container, 'area-separator')) {
      expect(pointsOf(el).some((p) => p.x === xOf(6))).toBe(false)
    }
  })

  it('counts a negative value as zero, with one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderChart({
      data: patched({ 3: { warranty: -20 }, 4: { warranty: -5 } }),
    })
    const top = layers(container, 'warn')
    expect(top).toHaveLength(1)
    expect(extentAt(top[0], 3)).toEqual([318, 318])
    expect(extentAt(layers(container, 'accent-soft')[0], 3)).toEqual([200, 318])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toMatch(/^\[tally-charts\] .*negative/)
  })
})

describe('<StackedAreaChart> edge cases', () => {
  it('draws no layer for a single row, without throwing', () => {
    const { container } = renderChart({ data: weeks.slice(0, 1) })
    expect(parts(container, 'area-layer')).toHaveLength(0)
    expect(parts(container, 'area-separator')).toHaveLength(0)
    expect(container.innerHTML).not.toContain('NaN')
  })

  it('draws one layer and no separator for one series', () => {
    const { container } = renderChart({ series: three.slice(0, 1) })
    expect(parts(container, 'area-layer')).toHaveLength(1)
    expect(parts(container, 'area-separator')).toHaveLength(0)
  })

  it('has no NaN in a 60 px wide chart', () => {
    const { container } = render(
      <StackedAreaChart<Week>
        data={weeks}
        x="week"
        series={three}
        forecastFrom="W10"
        forecastLabel="today"
        width={60}
        title="Crew hours per week"
        animate={false}
      />,
    )
    for (const el of container.querySelectorAll('path, line, text')) {
      for (const attr of el.getAttributeNames()) {
        expect(el.getAttribute(attr)).not.toContain('NaN')
      }
    }
    expect(container.innerHTML).not.toContain('NaN')
  })
})

describe('<StackedAreaChart> on a time axis', () => {
  type Day = { at: string; a: number; b: number }
  const days: Day[] = [
    { at: '2026-01-03', a: 30, b: 10 },
    { at: '2026-01-01', a: 10, b: 10 },
    { at: '2026-01-05', a: 50, b: 10 },
    { at: '2026-01-02', a: 20, b: 10 },
    { at: '2026-01-04', a: 40, b: 10 },
  ]
  // 400 px over Jan 1 – Jan 5: 100 px per day.
  const renderDays = (props: Partial<StackedAreaChartProps<Day>> = {}) =>
    render(
      <StackedAreaChart<Day>
        data={days}
        x={{ type: 'time', field: 'at', domain: ['2026-01-01', '2026-01-05'] }}
        series={[
          { id: 'a', label: 'A', value: 'a' },
          { id: 'b', label: 'B', value: 'b' },
        ]}
        domain={[0, 100]}
        width={400}
        height={100}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        title="Daily"
        animate={false}
        {...props}
      />,
    )

  it('draws the layers in date order', () => {
    const { container } = renderDays()
    const [a] = parts(container, 'area-layer')
    expect(edgesOf(a).upper).toEqual([
      { x: 0, y: 90 },
      { x: 100, y: 80 },
      { x: 200, y: 70 },
      { x: 300, y: 60 },
      { x: 400, y: 50 },
    ])
  })

  it('splits at the date before an ISO `forecastFrom`', () => {
    const { container } = renderDays({ forecastFrom: '2026-01-04' })
    const hatch = parts(container, 'area-layer').filter(
      (el) => el.getAttribute('data-ch-fill') === 'hatch',
    )
    expect(hatch).toHaveLength(2)
    expect(xsOf(hatch[0])).toEqual([200, 300, 400])
    expect(parts(container, 'forecast-rule')[0]).toHaveAttribute('x1', '200')
  })

  const hatchedXs = (root: HTMLElement) =>
    parts(root, 'area-layer')
      .filter((el) => el.getAttribute('data-ch-fill') === 'hatch')
      .map(xsOf)

  it('splits at the last date before a `forecastFrom` between two rows', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderDays({ forecastFrom: '2026-01-03T12:00:00Z' })
    expect(hatchedXs(container)).toEqual([
      [200, 300, 400],
      [200, 300, 400],
    ])
    expect(parts(container, 'forecast-rule')[0]).toHaveAttribute('x1', '200')
    expect(warn).not.toHaveBeenCalled()
  })

  it('splits at a row on the same day as a `forecastFrom` with a time of day', () => {
    const { container } = renderDays({ forecastFrom: new Date(Date.UTC(2026, 0, 4, 15, 30)) })
    expect(hatchedXs(container)).toEqual([
      [300, 400],
      [300, 400],
    ])
    expect(parts(container, 'forecast-rule')[0]).toHaveAttribute('x1', '300')
  })

  it('hatches nothing, without a warning, for a `forecastFrom` at or before the first date', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const from of ['2026-01-01', '2025-12-01']) {
      const { container, unmount } = renderDays({ forecastFrom: from, forecastLabel: 'today' })
      expect(hatchedXs(container)).toEqual([])
      expect(parts(container, 'forecast-rule')).toHaveLength(0)
      expect(parts(container, 'forecast-label')).toHaveLength(0)
      unmount()
    }
    expect(warn).not.toHaveBeenCalled()
  })

  it('warns once and hatches nothing for a `forecastFrom` that is not a date', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderDays({ forecastFrom: 'soon' })
    expect(hatchedXs(container)).toEqual([])
    expect(parts(container, 'forecast-rule')).toHaveLength(0)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toMatch(/^\[tally-charts\] .*"soon".*not a date/)
  })

  it('hatches every drawn row, with no rule, when the split date is before the domain', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    // 400 px over Jan 2 – Jan 5; Jan 1, the split row, is outside.
    const { container } = renderDays({
      x: { type: 'time', field: 'at', domain: ['2026-01-02', '2026-01-05'] },
      forecastFrom: '2026-01-02',
      forecastLabel: 'today',
    })
    expect(parts(container, 'area-layer').map((el) => el.getAttribute('data-ch-fill'))).toEqual([
      'hatch',
      'hatch',
    ])
    expect(hatchedXs(container)[0]).toEqual([0, 133.33, 266.67, 400])
    expect(parts(container, 'forecast-rule')).toHaveLength(0)
    expect(parts(container, 'forecast-label')).toHaveLength(0)
    expect(parts(container, 'area-separator')).toHaveLength(0)
  })
})

describe('<StackedAreaChart> grid and axes', () => {
  it('draws the grid and both axes by default and drops each on request', () => {
    const on = renderChart()
    expect(parts(on.container, 'grid')).toHaveLength(1)
    expect(on.container.querySelector('[data-ch-part="axis"][data-ch-side="left"]')).not.toBeNull()
    expect(
      on.container.querySelector('[data-ch-part="axis"][data-ch-side="bottom"]'),
    ).not.toBeNull()
    on.unmount()
    const off = renderChart({ grid: false, yAxis: 'none', xAxis: 'none' })
    expect(parts(off.container, 'grid')).toHaveLength(0)
    expect(parts(off.container, 'axis')).toHaveLength(0)
  })
})

describe('<StackedAreaChart> data table', () => {
  it('lists the x and every series with its real value', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderChart({ data: patched({ 3: { warranty: -20 } }) })
    const table = container.querySelector('table')
    const headers = [...(table?.querySelectorAll('thead th') ?? [])].map((th) => th.textContent)
    expect(headers.slice(0, 4)).toEqual(['Week', 'Install', 'Service', 'Warranty'])
    const third = [...(table?.querySelectorAll('tbody tr')[2]?.children ?? [])].map(
      (c) => c.textContent,
    )
    expect(third.slice(0, 4)).toEqual(['W3', '200 h', '118 h', '-20 h'])
  })
})

describe('<StackedAreaChart> dev warnings', () => {
  it('warns once about more than five series', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const six = Array.from({ length: 6 }, (_, i) => ({
      id: `s${i}`,
      label: `S${i}`,
      value: 'install' as const,
    }))
    const { container } = renderChart({ series: six })
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toMatch(/^\[tally-charts\] .*6 series/)
    // The sixth layer repeats the first tone.
    expect(parts(container, 'area-layer')[5]).toHaveAttribute('data-ch-tone', 'accent')
  })

  it('warns once about a repeated series id and still draws every series', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { container } = renderChart({
      series: three.map((s) => ({ ...s, id: 'same' })),
    })
    expect(parts(container, 'area-layer')).toHaveLength(3)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toMatch(/^\[tally-charts\] .*series id "same"/)
    expect(error).not.toHaveBeenCalled()
  })

  it('shows the empty state for no series, with one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderChart({ series: [] })
    expect(container.querySelector('[data-ch-part="empty"]')?.textContent).toBe('No data')
    expect(parts(container, 'area-layer')).toHaveLength(0)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toMatch(/^\[tally-charts\] .*at least one series/)
  })

  it('does not warn about the shared data', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderChart({ forecastFrom: 'W10', forecastLabel: 'today' })
    expect(warn).not.toHaveBeenCalled()
  })
})

/** The weeks at 600 × 280 with the default margins and domain, as an end-label reader sees them. */
function renderLabelled(props: Partial<StackedAreaChartProps<Week>> = {}) {
  return render(
    <StackedAreaChart<Week>
      data={weeks}
      x="week"
      series={three}
      format={(v) => `${v} h`}
      width={600}
      title="Crew hours per week"
      animate={false}
      {...props}
    />,
  )
}

/** The last (rightmost) extent of a layer path in px: [lower y, upper y] and its x. */
function lastColumn(el: Element | undefined) {
  const { upper, lower } = edgesOf(el)
  const top = upper.at(-1) as P
  const bottom = lower.at(-1) as P
  return { x: top.x, low: bottom.y, high: top.y }
}

/** The k-th end label pair has its baselines at `mid − 4` and `mid + 14`, within 0.5 px. */
function expectPair(root: HTMLElement, k: number, mid: number) {
  const label = Number(parts(root, 'end-label')[k]?.getAttribute('y'))
  const value = Number(parts(root, 'end-value')[k]?.getAttribute('y'))
  expect(Math.abs(label - (mid - 4))).toBeLessThanOrEqual(0.5)
  expect(Math.abs(value - (mid + 14))).toBeLessThanOrEqual(0.5)
}

describe('<StackedAreaChart> end labels', () => {
  it('names each layer and its last value to the right of the plot, centred on the layer', () => {
    const { container } = renderLabelled()
    const labels = parts(container, 'end-label')
    const values = parts(container, 'end-value')
    expect(labels.map((t) => t.textContent)).toEqual(['Install', 'Service', 'Warranty'])
    expect(values.map((t) => t.textContent)).toEqual(['270 h', '165 h', '78 h'])
    // Right margin 10 + "Warranty" (8 × 6.5) + 8 = 70: the plot is 600 − 44 − 70 = 486 wide.
    for (const t of [...labels, ...values]) {
      expect(t).toHaveAttribute('x', '496')
      expect(t).toHaveAttribute('text-anchor', 'start')
    }
    // The scale decided before layout agrees with the rendered one: the name's baseline sits
    // 4 px above the layer's midpoint, the value's 14 px below it.
    const install = lastColumn(layers(container, 'accent')[0])
    expectPair(container, 0, (install.low + install.high) / 2)
    const top = lastColumn(layers(container, 'warn')[0])
    expectPair(container, 2, (top.low + top.high) / 2)
    for (const t of [...labels, ...values]) expect(t).not.toHaveAttribute('dy')
    // The plot is narrower than without end labels.
    const plain = renderLabelled({ endLabels: false })
    expect(parts(plain.container, 'end-label')).toHaveLength(0)
    expect(parts(plain.container, 'end-value')).toHaveLength(0)
    expect(install.x).toBeLessThan(lastColumn(layers(plain.container, 'accent')[0]).x)
  })

  it('draws none, and keeps the default margin, when two labels would overlap', () => {
    const data = patched({ 12: { service: 5 } })
    const { container } = renderLabelled({ data })
    expect(parts(container, 'end-label')).toHaveLength(0)
    expect(parts(container, 'end-value')).toHaveLength(0)
    const plain = renderLabelled({ data, endLabels: false })
    expect(lastColumn(layers(container, 'accent')[0]).x).toBe(
      lastColumn(layers(plain.container, 'accent')[0]).x,
    )
  })

  it('fits the right margin to a long series name', () => {
    const long = 'A thirty character series name'
    expect(long).toHaveLength(30)
    const { container } = renderLabelled({
      series: [{ ...(three[0] as AreaSeries<Week>), label: long }, ...three.slice(1)],
    })
    const labels = parts(container, 'end-label')
    expect(labels).toHaveLength(3)
    expect(labels[0]).toHaveTextContent(long)
    // 10 + 30 × 6.5 + 8 = 213.
    expect(labels[0]).toHaveAttribute('x', String(600 - 44 - 213 + 10))
  })

  it('draws none when the last row is incomplete', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderLabelled({ data: patched({ 12: { service: null } }) })
    expect(parts(container, 'end-label')).toHaveLength(0)
    expect(parts(container, 'end-value')).toHaveLength(0)
  })

  it('skips a zero layer', () => {
    const { container } = renderLabelled({ data: patched({ 12: { warranty: 0 } }) })
    expect(parts(container, 'end-label').map((t) => t.textContent)).toEqual(['Install', 'Service'])
  })

  it('places the pair on the rendered scale with a custom height and top and bottom margins', () => {
    const { container } = renderLabelled({ height: 400, margin: { top: 50, bottom: 70 } })
    expect(parts(container, 'end-label')).toHaveLength(3)
    for (const [k, tone] of ['accent', 'accent-soft', 'warn'].entries()) {
      const column = lastColumn(layers(container, tone)[0])
      expectPair(container, k, (column.low + column.high) / 2)
    }
  })

  it('keeps all three labels for the weeks at the default height', () => {
    // W12 centres over [0, 600] in 224 px: 50.4, 131.6 and 177.0 px above the baseline; the
    // closest two are 45.4 px apart.
    const { container } = renderLabelled()
    const ys = parts(container, 'end-label').map((t) => Number(t.getAttribute('y')))
    expect(ys).toHaveLength(3)
    expect(Math.abs((ys[1] as number) - (ys[2] as number))).toBeCloseTo(45.36, 1)
  })

  it('draws none when two centres are closer than 36 px, and all at 36 px', () => {
    // 600 px over [0, 600]: service and warranty centres sit (service + warranty) / 2 apart.
    const close = renderChart({ data: patched({ 12: { service: 33, warranty: 33 } }) })
    expect(parts(close.container, 'end-label')).toHaveLength(0)
    close.unmount()
    const apart = renderChart({ data: patched({ 12: { service: 36, warranty: 36 } }) })
    expect(parts(apart.container, 'end-label')).toHaveLength(3)
  })

  it('fits the right margin to a long value at 8 px per character', () => {
    const format = (v: number) => `${v} hours of crew work`
    const { container } = renderLabelled({
      format,
      series: three.map((s, i) => ({ ...s, label: `S${i}` })),
    })
    const labels = parts(container, 'end-label')
    expect(labels).toHaveLength(3)
    // 10 + "270 hours of crew work" (22 × 8) + 8 = 194.
    expect(labels[0]).toHaveAttribute('x', String(600 - 44 - (10 + 22 * 8 + 8) + 10))
  })

  it('draws none, and keeps the default margin, for a lone last x after an incomplete row', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const data = patched({ 11: { service: null } })
    const { container } = renderLabelled({ data })
    expect(parts(container, 'end-label')).toHaveLength(0)
    const plain = renderLabelled({ data, endLabels: false })
    expect(lastColumn(layers(container, 'accent')[0]).x).toBe(
      lastColumn(layers(plain.container, 'accent')[0]).x,
    )
  })

  describe('on a time axis', () => {
    type Day = { at: string; a: number; b: number }
    const days: Day[] = [
      { at: '2026-01-01', a: 100, b: 100 },
      { at: '2026-01-02', a: 100, b: 100 },
      { at: '2026-01-03', a: 100, b: 100 },
      { at: '2026-01-04', a: 100, b: 100 },
      { at: '2026-01-05', a: 100, b: 100 },
    ]
    const renderDays = (domain?: [string, string], nice?: boolean) =>
      render(
        <StackedAreaChart<Day>
          data={days}
          x={{ type: 'time', field: 'at', domain, nice }}
          series={[
            { id: 'a', label: 'A', value: 'a' },
            { id: 'b', label: 'B', value: 'b' },
          ]}
          width={600}
          title="Daily"
          animate={false}
        />,
      )
    const firstX = (root: HTMLElement) => edgesOf(parts(root, 'area-layer')[0]).upper.at(-1)?.x

    it('draws none, and keeps the default margin, when the last date is outside the x domain', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const cut = renderDays(['2026-01-01', '2026-01-04'])
      expect(parts(cut.container, 'end-label')).toHaveLength(0)
      // Jan 4 sits at the right edge of a 600 − 44 − 16 = 540 px plot.
      expect(firstX(cut.container)).toBe(540)
    })

    it('draws them when the explicit domain holds the last date', () => {
      const all = renderDays(['2026-01-01', '2026-01-05'])
      expect(parts(all.container, 'end-label')).toHaveLength(2)
      const inferred = renderDays()
      expect(parts(inferred.container, 'end-label')).toHaveLength(2)
    })

    it('decides on the nice domain when `nice` widens an explicit one', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      // A domain ending at 18:00 on Jan 4 leaves Jan 5 out, unless `nice` rounds it to Jan 5.
      const exact = renderDays(['2026-01-01', '2026-01-04T18:00:00Z'])
      expect(parts(exact.container, 'end-label')).toHaveLength(0)
      exact.unmount()
      const rounded = renderDays(['2026-01-01', '2026-01-04T18:00:00Z'], true)
      // Jan 5 is drawn (five columns), so the labels describe it.
      expect(edgesOf(parts(rounded.container, 'area-layer')[0]).upper).toHaveLength(5)
      expect(parts(rounded.container, 'end-label')).toHaveLength(2)
    })
  })

  it('lets a user margin win over the end-label column', () => {
    const { container } = renderLabelled({ margin: { right: 0 } })
    expect(parts(container, 'end-label')[0]).toHaveAttribute('x', String(600 - 44 + 10))
  })
})

const tooltip = (root: HTMLElement) => root.querySelector('[data-ch-part="tooltip"]')
const live = (root: HTMLElement) => root.querySelector('[aria-live]')?.textContent

describe('<StackedAreaChart> points and tooltip', () => {
  it('shows every series top layer first, then the total, when hovering near an x', () => {
    const { container } = renderChart()
    const layer = container.querySelector('[data-ch-part="pointer-layer"]') as Element
    // jsdom's bounding box is at 0,0, so client coordinates are plot coordinates.
    fireEvent.pointerMove(layer, { clientX: xOf(4) + 10, clientY: 300 })
    expect(tooltip(container)).toHaveTextContent(
      /^W468 hWarranty130 hService210 hInstall408 hTotal$/,
    )
    expect(tooltip(container)?.querySelector('[data-ch-tone="warn"]')).toHaveTextContent(
      '68 hWarranty',
    )
  })

  it('announces every series and the total for the keyboard', () => {
    const { container } = renderChart()
    const chart = screen.getByRole('application', { name: 'Crew hours per week' })
    fireEvent.keyDown(chart, { key: 'ArrowRight' })
    expect(live(container)).toBe(
      '1 of 12, W1, 60 h Warranty, 120 h Service, 180 h Install, 360 h Total',
    )
    fireEvent.keyDown(chart, { key: 'ArrowRight' })
    expect(live(container)).toBe(
      '2 of 12, W2, 55 h Warranty, 125 h Service, 190 h Install, 370 h Total',
    )
    fireEvent.keyDown(chart, { key: 'End' })
    expect(live(container)).toBe(
      '12 of 12, W12, 78 h Warranty, 165 h Service, 270 h Install, 513 h Total',
    )
  })

  it('reports the user row to onSelect and to a function tooltip', () => {
    const onSelect = vi.fn()
    const content = vi.fn(() => 'custom')
    const { container } = renderChart({ onSelect, tooltip: content })
    const layer = container.querySelector('[data-ch-part="pointer-layer"]') as Element
    fireEvent.click(layer, { clientX: xOf(4), clientY: 300 })
    expect(onSelect).toHaveBeenCalledWith('W4', expect.objectContaining({ datum: weeks[3] }))
    fireEvent.pointerMove(layer, { clientX: xOf(4), clientY: 300 })
    expect(content).toHaveBeenLastCalledWith(expect.objectContaining({ datum: weeks[3] }))
    expect(tooltip(container)).toHaveTextContent('custom')
  })

  it('marks the active x with a cursor from the baseline to the top and a dot per layer', () => {
    const { container } = renderChart({ activeId: 'W4' })
    const cursor = parts(container, 'cursor')
    expect(cursor).toHaveLength(1)
    expect(cursor[0]).toHaveAttribute('x1', String(xOf(4)))
    expect(cursor[0]).toHaveAttribute('x2', String(xOf(4)))
    expect(cursor[0]).toHaveAttribute('y1', '600')
    expect(cursor[0]).toHaveAttribute('y2', String(yOf(408)))
    const dots = parts(container, 'cursor-dot')
    expect(dots.map((d) => d.getAttribute('cy'))).toEqual(
      [210, 340, 408].map((v) => String(yOf(v))),
    )
    expect(dots.every((d) => d.getAttribute('cx') === String(xOf(4)))).toBe(true)
    expect(dots.map((d) => d.getAttribute('r'))).toEqual(['4', '4', '4'])
    expect(dots.map((d) => d.getAttribute('data-ch-tone'))).toEqual([
      'accent',
      'accent-soft',
      'warn',
    ])
  })

  it('draws no cursor without an active point', () => {
    const { container } = renderChart()
    expect(parts(container, 'cursor')).toHaveLength(0)
    expect(parts(container, 'cursor-dot')).toHaveLength(0)
  })

  it('keeps a point for a row with a missing value: its finite series and no total', () => {
    const { container } = renderChart({ data: patched({ 5: { service: null } }), activeId: 'W5' })
    expect(tooltip(container)).toHaveTextContent(/^W562 hWarranty205 hInstall$/)
    // The cursor runs to the top of the plot, with no dots.
    expect(parts(container, 'cursor')[0]).toHaveAttribute('y2', '0')
    expect(parts(container, 'cursor-dot')).toHaveLength(0)
    const row = within(screen.getByRole('table')).getAllByRole('row')[5] as HTMLElement
    const cells = within(row).getAllByRole('cell')
    // An empty cell reads as the table's "no value".
    expect(cells.map((c) => c.textContent)).toEqual(['205 h', '—no value', '62 h', '—no value'])
  })

  it('shows a negative value as it is, and the drawn total', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderChart({ data: patched({ 3: { warranty: -20 } }), activeId: 'W3' })
    expect(tooltip(container)).toHaveTextContent(
      /^W3-20 hWarranty118 hService200 hInstall318 hTotal$/,
    )
    const row = within(screen.getByRole('table')).getAllByRole('row')[3] as HTMLElement
    expect(
      within(row)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['200 h', '118 h', '-20 h', '318 h'])
  })

  it('has one point for one row, and a cursor without a crash', () => {
    const { container } = renderChart({ data: weeks.slice(0, 1), activeId: 'W1' })
    expect(registered.at(-1)).toHaveLength(1)
    expect(parts(container, 'cursor')).toHaveLength(1)
    expect(parts(container, 'cursor-dot')).toHaveLength(3)
    expect(container.innerHTML).not.toContain('NaN')
  })

  it('walks unsorted dates in date order', () => {
    type Day = { at: string; a: number; b: number }
    const days: Day[] = [
      { at: '2026-01-03', a: 30, b: 10 },
      { at: '2026-01-01', a: 10, b: 10 },
      { at: '2026-01-02', a: 20, b: 10 },
    ]
    const onActiveChange = vi.fn()
    render(
      <StackedAreaChart<Day>
        data={days}
        x={{ type: 'time', field: 'at' }}
        series={[
          { id: 'a', label: 'A', value: 'a' },
          { id: 'b', label: 'B', value: 'b' },
        ]}
        width={400}
        title="Daily"
        animate={false}
        onActiveChange={onActiveChange}
      />,
    )
    const chart = screen.getByRole('application', { name: 'Daily' })
    fireEvent.keyDown(chart, { key: 'Home' })
    fireEvent.keyDown(chart, { key: 'ArrowRight' })
    fireEvent.keyDown(chart, { key: 'ArrowRight' })
    expect(onActiveChange.mock.calls.map((c) => c[0])).toEqual([
      '2026-01-01T00:00:00.000Z',
      '2026-01-02T00:00:00.000Z',
      '2026-01-03T00:00:00.000Z',
    ])
    expect(onActiveChange.mock.calls.map((c) => c[1]?.datum)).toEqual([days[1], days[2], days[0]])
  })

  it('registers the same points array again when re-rendered with the same props', () => {
    const props: StackedAreaChartProps<Week> = {
      data: weeks,
      x: 'week',
      series: three,
      format: (v) => `${v} h`,
      forecastFrom: 'W10',
      width: 600,
      title: 'Crew hours per week',
      animate: false,
    }
    const { rerender } = render(<StackedAreaChart<Week> {...props} />)
    const first = registered.at(-1)
    expect(first).toHaveLength(12)
    rerender(<StackedAreaChart<Week> {...props} />)
    rerender(<StackedAreaChart<Week> {...props} />)
    expect(registered.at(-1)).toBe(first)
  })

  it('shows no tooltip with `tooltip={false}`', () => {
    const { container } = renderChart({ tooltip: false, activeId: 'W4' })
    expect(tooltip(container)).toBeNull()
  })
})

describe('<StackedAreaChart> with interactive={false}', () => {
  it('has no tab stop, pointer, cursor or tooltip, and keeps the end labels and the table', () => {
    const { container } = renderLabelled({ interactive: false, tooltip: true, activeId: 'W4' })
    expect(container.querySelector('[role="application"]')).toBeNull()
    expect(container.querySelector('[tabindex]')).toBeNull()
    expect(parts(container, 'pointer-layer')).toHaveLength(0)
    expect(parts(container, 'cursor')).toHaveLength(0)
    expect(parts(container, 'cursor-dot')).toHaveLength(0)
    expect(tooltip(container)).toBeNull()
    const plot = container.querySelector('[data-ch-part="plot"]') as Element
    fireEvent.pointerMove(plot, { clientX: 150, clientY: 50 })
    expect(tooltip(container)).toBeNull()
    expect(parts(container, 'end-label')).toHaveLength(3)
    expect(container.querySelector('table')).not.toBeNull()
    expect(container.textContent).toContain('Crew hours per week')
  })
})

describe('<StackedAreaChart> total column', () => {
  const headers = () =>
    within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((th) => th.textContent)

  it('ends the table with the drawn total, renamed or dropped on request', () => {
    const { unmount } = renderChart()
    expect(headers()).toEqual(['Week', 'Install', 'Service', 'Warranty', 'Total'])
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(12)
    const w12 = within(rows[11] as HTMLElement).getAllByRole('cell')
    expect(w12.at(-1)?.textContent).toBe('513 h')
    unmount()
    const renamed = renderChart({ dataTable: { columns: { Total: 'All work' } } })
    expect(headers().at(-1)).toBe('All work')
    renamed.unmount()
    const none = renderChart({ dataTable: false })
    expect(none.container.querySelector('table')).toBeNull()
  })
})
