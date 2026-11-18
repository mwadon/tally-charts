import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { type AreaSeries, StackedAreaChart, type StackedAreaChartProps } from './StackedAreaChart'

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
