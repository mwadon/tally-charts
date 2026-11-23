import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { autoTickLabels, createDateFormatter } from '../../core/date'
import { CHAR_WIDTH } from '../../core/text'
import { estimateWidth, fitTimeTicks, type Tick, withLabels } from '../../core/ticks'
import {
  DAY,
  inferTimeDomain,
  niceTimeDomain,
  type TimeScale,
  timeScale,
  toTime,
} from '../../core/time'
import { ChartsProvider } from '../ChartsProvider'
import type { ChartMessages } from '../messages'
import type { ChartPoint } from '../types'
import { GanttChart, type GanttChartProps } from './GanttChart'
import { doneShare, ganttColumns, ganttMark, ganttRows } from './gantt-geometry'

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

type Task = {
  name: string
  phase: string | null
  start: unknown
  end?: unknown
  plannedStart?: unknown
  plannedEnd?: unknown
}

const remodel: Task[] = [
  ['Site protection', 'Prep', '03-02', '03-04', '03-02', '03-04'],
  ['Demolition', 'Prep', '03-04', '03-09', '03-04', '03-08'],
  ['Haul-away', 'Prep', '03-09', '03-10', '03-08', '03-09'],
  ['Framing changes', 'Rough-in', '03-10', '03-14', '03-09', '03-13'],
  ['Plumbing rough-in', 'Rough-in', '03-14', '03-21', '03-13', '03-18'],
  ['Electrical rough-in', 'Rough-in', '03-16', '03-21', '03-15', '03-20'],
  ['Rough inspection', 'Rough-in', '03-23', null, '03-20', null],
  ['Drywall and paint', 'Rough-in', '03-23', '03-31', '03-20', '03-28'],
  ['Cabinets', 'Finishes', '03-31', '04-05', '03-28', '04-02'],
  ['Countertops', 'Finishes', '04-05', '04-08', '04-02', '04-05'],
  ['Tile backsplash', 'Finishes', '04-08', '04-12', '04-05', '04-09'],
  ['Fixtures and appliances', 'Finishes', '04-12', '04-16', '04-09', '04-13'],
  ['Final walkthrough', 'Finishes', '04-17', null, '04-14', null],
].map(([name, phase, start, end, plannedStart, plannedEnd]) => ({
  name: name as string,
  phase: phase as string,
  start: `2026-${start}`,
  ...(end ? { end: `2026-${end}` } : {}),
  plannedStart: `2026-${plannedStart}`,
  ...(plannedEnd ? { plannedEnd: `2026-${plannedEnd}` } : {}),
}))

const NOW = '2026-03-27'
const TICK_ROW = 28
const NOW_ROW = 28
const KEY_LINE = 24

type Props = Record<string, unknown>

const BASE = {
  x: 'name',
  start: 'start',
  end: 'end',
  group: 'phase',
  baselineStart: 'plannedStart',
  baselineEnd: 'plannedEnd',
  now: NOW,
}

/**
 * A 720 px chart of `remodel` without value labels or key, unless `props` says otherwise; inside a
 * `ChartsProvider` when `provider` is given.
 */
function renderChart(
  props: Props = {},
  provider?: { locale?: string; messages?: Partial<ChartMessages> },
) {
  const all = {
    data: remodel,
    ...BASE,
    width: 720,
    valueLabels: false,
    legend: false,
    title: 'Kitchen remodel',
    animate: false,
    ...props,
  } as unknown as GanttChartProps<Task>
  const chart = <GanttChart<Task> {...all} />
  return render(provider ? <ChartsProvider {...provider}>{chart}</ChartsProvider> : chart)
}

const parts = (root: Element, part: string) => [
  ...root.querySelectorAll<SVGElement>(`[data-ch-part="${part}"]`),
]
const one = (root: Element, part: string) =>
  root.querySelector<SVGElement>(`[data-ch-part="${part}"]`)
const num = (el: Element | null | undefined, attr: string) => Number(el?.getAttribute(attr))
const svgHeight = (root: Element) => num(root.querySelector('svg'), 'height')
/** A diamond's centre: the first `translate(x,y)` of its transform. */
const centreOf = (el: Element | null | undefined): [number, number] => {
  const m = el?.getAttribute('transform')?.match(/^translate\(([-\d.]+),([-\d.]+)\) rotate\(45\)/)
  return [Number(m?.[1]), Number(m?.[2])]
}
const translateY = (el: Element) =>
  Number(el.getAttribute('transform')?.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/)?.[2])
const rowByName = (root: Element, name: string) =>
  parts(root, 'gantt-row').find((row) => one(row, 'gantt-name')?.textContent === name) as Element
const names = (root: Element) => parts(root, 'gantt-name').map((el) => el.textContent)
const headings = (root: Element) =>
  parts(root, 'gantt-heading').map((el) => el.querySelector('text')?.textContent)
const quiet = () => vi.spyOn(console, 'warn').mockImplementation(() => {})
const warnings = (spy: ReturnType<typeof quiet>, text: string) =>
  spy.mock.calls.filter((call) => String(call[0]).includes(text))
/** Every attribute value in the chart, to look for NaN and negative sizes. */
const attributes = (root: Element) =>
  [...root.querySelectorAll('*')].flatMap((el) =>
    [...el.attributes].map((a) => ({ name: a.name, value: a.value })),
  )
const segmentsOf = (row: Element) =>
  parts(row, 'gantt-segment').map((s) => ({
    x: num(s, 'x'),
    width: num(s, 'width'),
    fill: s.getAttribute('data-ch-fill'),
    tone: s.getAttribute('data-ch-tone'),
  }))

const time = (value: unknown) => toTime(value) as number

/** The chart's own layout and scale, from the geometry functions, for `data` at `width`. */
function expected(
  data: readonly Task[],
  {
    width = 720,
    position = 'auto',
    domain,
    valueWidth = 0,
  }: {
    width?: number
    position?: 'auto' | 'left' | 'top'
    domain?: [string, string]
    valueWidth?: number
  } = {},
) {
  const widest = Math.max(
    ...data.flatMap((d) => [d.name, d.phase ?? ''].map((t) => t.length * CHAR_WIDTH)),
  )
  const cols = ganttColumns({ width, nameWidth: widest, valueWidth, position })
  // About one tick per 100 px, at least five: the domain is niced and the ticks drawn with it.
  const count = Math.max(5, Math.round(cols.plotWidth / 100))
  const times = data.flatMap((d) =>
    [d.start, d.end, d.plannedStart, d.plannedEnd].filter((v) => v != null).map(time),
  )
  const range: [number, number] = domain
    ? [time(domain[0]), time(domain[1])]
    : niceTimeDomain(inferTimeDomain(times), 'utc', count)
  const scale = timeScale(range, [0, cols.plotWidth], 'utc')
  return { ...cols, count, scale }
}

/**
 * The tick labels the chart draws: autoTickLabels with the ticks' step, those that would cross the
 * chart's right edge dropped, then fitted as Axis does.
 */
function fittedTicks(values: number[], scale: TimeScale, plotX: number, width: number): Tick[] {
  const [a, b] = values
  const step = a !== undefined && b !== undefined ? b - a : undefined
  const label = (list: readonly number[]) => autoTickLabels(list, { zone: 'utc', step })
  const inside = (t: Tick) => plotX + t.position + estimateWidth(t) <= width
  const ticks: Tick[] = values.map((value) => ({
    value,
    position: scale(value) + 6,
    label: '',
    anchor: 'start',
  }))
  return fitTimeTicks(withLabels(ticks, label).filter(inside), label, estimateWidth).filter(inside)
}

/** What `ganttMark` draws for a remodel row with the chart's scale. */
function markOf(
  d: Task,
  scale: TimeScale,
  plotWidth: number,
  { now = NOW as string | undefined, progress = undefined as number | undefined } = {},
) {
  const start = time(d.start)
  const end = d.end == null ? null : time(d.end)
  const nowMs = now === undefined ? undefined : time(now)
  return ganttMark(
    {
      start,
      end,
      baselineStart: d.plannedStart == null ? null : time(d.plannedStart),
      baselineEnd: d.plannedEnd == null ? null : time(d.plannedEnd),
      done:
        end === null
          ? nowMs === undefined || start <= nowMs
            ? 1
            : 0
          : doneShare(start, end, progress, nowMs),
    },
    scale,
    plotWidth,
  )
}

describe('GanttChart rows', () => {
  it('draws 13 rows under three headings, at the y of ganttRows below the tick row', () => {
    const { container } = renderChart()
    expect(one(container, 'gantt')?.getAttribute('data-ch-labels')).toBe('left')
    const rows = parts(container, 'gantt-row')
    expect(rows).toHaveLength(13)
    expect(rows.filter((r) => r.getAttribute('data-ch-kind') === 'task')).toHaveLength(11)
    expect(rows.filter((r) => r.getAttribute('data-ch-kind') === 'milestone')).toHaveLength(2)
    expect(headings(container)).toEqual(['Prep', 'Rough-in', 'Finishes'])

    const layout = ganttRows(
      remodel.map((d) => d.phase),
      false,
    )
    const drawn = [
      ...container.querySelectorAll('[data-ch-part="gantt-row"], [data-ch-part="gantt-heading"]'),
    ]
    expect(drawn.map(translateY)).toEqual(layout.entries.map((e) => e.y + TICK_ROW))
    // `now` is inside the domain, so the now label's row comes under the rows.
    expect(svgHeight(container)).toBe(TICK_ROW + layout.height + NOW_ROW)
  })

  it('sizes the name column from the widest name or group name and keeps data order', () => {
    const { container } = renderChart()
    const { plotX } = expected(remodel)
    // The widest is "Fixtures and appliances".
    expect(plotX).toBe(
      ganttColumns({ width: 720, nameWidth: 23 * CHAR_WIDTH, valueWidth: 0, position: 'auto' })
        .plotX,
    )
    const bar = one(rowByName(container, 'Site protection'), 'gantt-segment')
    expect(num(bar, 'x')).toBeCloseTo(plotX + expected(remodel).scale(time('2026-03-02')), 1)
    expect(names(container)).toEqual(remodel.map((d) => d.name))
  })

  it('draws no headings without `group`, 13 rows in data order', () => {
    const { container } = renderChart({ group: undefined })
    expect(parts(container, 'gantt-heading')).toHaveLength(0)
    expect(parts(container, 'gantt-row')).toHaveLength(13)
    expect(names(container)).toEqual(remodel.map((d) => d.name))
  })
})

describe('GanttChart bars', () => {
  it('draws each task as ganttMark does with the chart scale', () => {
    const { container } = renderChart()
    const { plotX, plotWidth, scale } = expected(remodel)
    for (const d of remodel) {
      const row = rowByName(container, d.name)
      const mark = markOf(d, scale, plotWidth)
      if (mark.milestone) continue
      expect(segmentsOf(row)).toEqual(
        mark.segments.map((s) => ({
          x: Math.round((plotX + s.x) * 100) / 100,
          width: s.width,
          fill: s.fill,
          tone: s.over ? 'loss' : 'accent',
        })),
      )
      for (const s of parts(row, 'gantt-segment')) {
        expect(num(s, 'y')).toBe(7)
        expect(num(s, 'height')).toBe(14)
      }
    }
    const summary = (name: string) =>
      segmentsOf(rowByName(container, name)).map((s) => `${s.fill}:${s.tone}`)
    expect(summary('Site protection')).toEqual(['solid:accent'])
    expect(summary('Demolition')).toEqual(['solid:accent', 'solid:loss'])
    expect(summary('Drywall and paint')).toEqual(['solid:accent', 'hatch:accent'])
    expect(summary('Cabinets')).toEqual(['hatch:accent'])
  })

  it('draws no segment of width 0: one per finished task, two with an overrun', () => {
    // With value labels at 720 px (and without them at 360 px) a done point a float step off the
    // bar's end once left a 0 px sliver after Site protection or Demolition.
    for (const props of [{ valueLabels: true }, { width: 360 }]) {
      const { container, unmount } = renderChart(props)
      for (const s of parts(container, 'gantt-segment')) expect(num(s, 'width')).toBeGreaterThan(0)
      const finished = ['Site protection', 'Haul-away', 'Framing changes', 'Electrical rough-in']
      for (const name of finished) {
        expect(segmentsOf(rowByName(container, name)).map((s) => `${s.fill}:${s.tone}`)).toEqual([
          'solid:accent',
        ])
      }
      for (const name of ['Demolition', 'Plumbing rough-in']) {
        expect(segmentsOf(rowByName(container, name)).map((s) => `${s.fill}:${s.tone}`)).toEqual([
          'solid:accent',
          'solid:loss',
        ])
      }
      unmount()
    }
  })

  it('paints segments with the tone or its hatch pattern', () => {
    const { container } = renderChart({ chartId: 'g' })
    const [solid, hatch] = parts(rowByName(container, 'Drywall and paint'), 'gantt-segment')
    expect(solid?.style.fill).toBe('var(--ch-accent)')
    expect(hatch?.style.fill).toMatch(/^url\("?#ch-g-hatch-accent"?\)$/)
  })

  it('changes the base tone with `tone` but keeps the overrun in loss', () => {
    const { container } = renderChart({ tone: 'gain' })
    const tones = segmentsOf(rowByName(container, 'Demolition')).map((s) => s.tone)
    expect(tones).toEqual(['gain', 'loss'])
  })

  it('draws a 2 px bar for a two-hour task', () => {
    const data: Task[] = [
      { name: 'Quick fix', phase: null, start: '2026-03-10T08:00Z', end: '2026-03-10T10:00Z' },
      { name: 'Long job', phase: null, start: '2026-03-01', end: '2026-04-01' },
    ]
    const { container } = renderChart({ data, group: undefined })
    const segs = segmentsOf(rowByName(container, 'Quick fix'))
    expect(segs).toHaveLength(1)
    expect(segs[0]?.width).toBe(2)
  })
})

describe('GanttChart baselines', () => {
  it('draws a 3 px baseline under each task at y 24, and a diamond for each milestone', () => {
    const { container } = renderChart()
    const { plotX, plotWidth, scale } = expected(remodel)
    const lines = parts(container, 'gantt-baseline')
    expect(lines).toHaveLength(11)
    for (const d of remodel.filter((t) => t.end)) {
      const line = one(rowByName(container, d.name), 'gantt-baseline')
      const mark = markOf(d, scale, plotWidth)
      expect(num(line, 'y')).toBe(24)
      expect(num(line, 'height')).toBe(3)
      expect(num(line, 'x')).toBeCloseTo(plotX + (mark.baseline?.x ?? Number.NaN), 1)
      expect(num(line, 'width')).toBe(mark.baseline?.width)
    }
    expect(parts(container, 'gantt-milestone-baseline')).toHaveLength(2)
  })

  it('draws none without the baseline accessors', () => {
    const { container } = renderChart({ baselineStart: undefined, baselineEnd: undefined })
    expect(parts(container, 'gantt-baseline')).toHaveLength(0)
    expect(parts(container, 'gantt-milestone-baseline')).toHaveLength(0)
  })
})

describe('GanttChart milestones', () => {
  it('fills reached milestones and centres the diamond on the start and the row', () => {
    const { container } = renderChart()
    const { plotX, scale } = expected(remodel)
    const inspection = one(rowByName(container, 'Rough inspection'), 'gantt-milestone')
    const walkthrough = one(rowByName(container, 'Final walkthrough'), 'gantt-milestone')
    expect(inspection?.getAttribute('data-ch-reached')).toBe('true')
    expect(walkthrough?.getAttribute('data-ch-reached')).toBe('false')
    for (const [el, date] of [
      [inspection, '2026-03-23'],
      [walkthrough, '2026-04-17'],
    ] as const) {
      const [cx, cy] = centreOf(el)
      expect(cx).toBeCloseTo(plotX + scale(time(date)), 1)
      expect(cy).toBe(16)
      expect(num(el, 'width')).toBe(12)
      expect(el?.getAttribute('transform')).toMatch(/rotate\(45\) translate\(-6,-6\)$/)
    }
  })
})

describe('GanttChart states', () => {
  it('draws every bar solid and every milestone reached without `now`', () => {
    const { container } = renderChart({ now: undefined })
    expect(
      parts(container, 'gantt-segment').every((s) => s.getAttribute('data-ch-fill') === 'solid'),
    ).toBe(true)
    expect(
      parts(container, 'gantt-milestone').map((m) => m.getAttribute('data-ch-reached')),
    ).toEqual(['true', 'true'])
  })

  it('splits a bar by its `progress` value, the rest solid, without `now`', () => {
    const { container } = renderChart({
      now: undefined,
      progress: (d: Task) => (d.name === 'Cabinets' ? 0.25 : undefined),
    })
    const fills = (name: string) => segmentsOf(rowByName(container, name)).map((s) => s.fill)
    expect(fills('Cabinets')).toEqual(['solid', 'hatch'])
    for (const d of remodel.filter((t) => t.end && t.name !== 'Cabinets')) {
      expect(fills(d.name).every((f) => f === 'solid')).toBe(true)
    }
  })

  it('ignores NaN and clamps -1 and 2 with one gantt-progress warning', () => {
    const spy = quiet()
    const values: Record<string, number> = {
      'Site protection': Number.NaN,
      Demolition: -1,
      'Haul-away': 2,
    }
    const { container } = renderChart({ progress: (d: Task) => values[d.name] })
    expect(warnings(spy, 'GanttChart progress must be a number from 0 to 1')).toHaveLength(1)
    for (const { value } of attributes(container)) expect(value).not.toMatch(/NaN/)
    const fills = (name: string) => segmentsOf(rowByName(container, name)).map((s) => s.fill)
    // NaN falls back to `now` (done), -1 is 0 (planned), 2 is 1 (done).
    expect(fills('Site protection')).toEqual(['solid'])
    expect(fills('Demolition').every((f) => f === 'hatch')).toBe(true)
    expect(fills('Haul-away')).toEqual(['solid'])
    spy.mockRestore()
  })

  it('lets a progress of 0 win over a `now` after the end', () => {
    const { container } = renderChart({
      progress: (d: Task) => (d.name === 'Haul-away' ? 0 : undefined),
    })
    expect(segmentsOf(rowByName(container, 'Haul-away')).map((s) => s.fill)).toEqual(['hatch'])
  })

  it('reads `now` at a start as planned and at an end as done', () => {
    const atStart = renderChart({ now: '2026-03-31' })
    expect(segmentsOf(rowByName(atStart.container, 'Cabinets')).map((s) => s.fill)).toEqual([
      'hatch',
    ])
    expect(
      segmentsOf(rowByName(atStart.container, 'Drywall and paint')).every(
        (s) => s.fill === 'solid',
      ),
    ).toBe(true)
  })

  it('warns once for an invalid `now` and treats it as absent', () => {
    const spy = quiet()
    const { container } = renderChart({ now: 'never' })
    expect(warnings(spy, 'GanttChart ignored an invalid `now`.')).toHaveLength(1)
    expect(
      parts(container, 'gantt-segment').every((s) => s.getAttribute('data-ch-fill') === 'solid'),
    ).toBe(true)
    spy.mockRestore()
  })
})

describe('GanttChart time axis', () => {
  it('labels the thinned ticks with autoTickLabels 6 px right of each tick, one grid line per tick', () => {
    const { container } = renderChart()
    const { plotX, count, scale } = expected(remodel)
    const values = scale.ticks(count)
    const kept = fittedTicks(values, scale, plotX, 720)
    expect(kept.length).toBeGreaterThan(1)
    const drawn = parts(container, 'gantt-tick')
    expect(drawn.map((t) => t.textContent)).toEqual(kept.map((t) => t.label))
    drawn.forEach((t, i) => {
      expect(num(t, 'x')).toBeCloseTo(plotX + (kept[i]?.position ?? Number.NaN), 1)
    })
    const grid = parts(container, 'gantt-grid')
    expect(grid).toHaveLength(values.length)
    const layout = ganttRows(
      remodel.map((d) => d.phase),
      false,
    )
    for (const line of grid) {
      expect(num(line, 'y1')).toBe(TICK_ROW)
      expect(num(line, 'y2')).toBe(TICK_ROW + layout.height)
    }
  })

  it('uses an explicit `domain` as given', () => {
    const domain: [string, string] = ['2026-03-01', '2026-04-26']
    const { container } = renderChart({ domain })
    const { plotX, scale } = expected(remodel, { domain })
    expect(scale.domain()).toEqual([time(domain[0]), time(domain[1])])
    const bar = one(rowByName(container, 'Site protection'), 'gantt-segment')
    expect(num(bar, 'x')).toBeCloseTo(plotX + scale(time('2026-03-02')), 1)
  })

  it('rounds a narrow chart out to at least five ticks, not to whole months', () => {
    // At 360 px with value labels the plot (281 px) would have three ticks by its width; niced
    // with three, Mar 2 – Apr 17 became Mar 1 – May 1, a fifth of the plot empty.
    const { container } = renderChart({ width: 360, valueLabels: true })
    const { plotX, plotWidth, count, scale } = expected(remodel, { width: 360, valueWidth: GUTTER })
    expect(Math.round(plotWidth / 100)).toBeLessThan(5)
    expect(count).toBe(5)
    const [, end] = scale.domain()
    expect(end).toBeGreaterThanOrEqual(time('2026-04-17'))
    expect(end).toBeLessThan(time('2026-04-27'))
    // The DOM agrees: Site protection starts where this scale puts Mar 2, and Fixtures and
    // appliances (to Apr 16) ends past 90% of the plot.
    const site = one(rowByName(container, 'Site protection'), 'gantt-segment')
    expect(num(site, 'x')).toBeCloseTo(plotX + scale(time('2026-03-02')), 1)
    const last = parts(rowByName(container, 'Fixtures and appliances'), 'gantt-segment').at(-1)
    const right = num(last, 'x') + num(last, 'width') - plotX
    expect(right).toBeCloseTo(scale(time('2026-04-16')), 1)
    expect(right).toBeGreaterThan(plotWidth * 0.9)
    // The ticks are drawn with the count the domain was niced with: one grid line each, the
    // first and the last on the plot's edges.
    const grid = parts(container, 'gantt-grid')
    expect(grid).toHaveLength(scale.ticks(count).length)
    expect(num(grid[0], 'x1')).toBeCloseTo(plotX, 1)
    expect(num(grid.at(-1), 'x1')).toBeCloseTo(plotX + plotWidth, 1)
  })

  it('keeps several ticks for a schedule of a few weeks at any width', () => {
    // Six tasks from May 4 to Jun 17, start and end only (the Plain story's deck build).
    const deck: Task[] = [
      ['Permits', '05-04', '05-15'],
      ['Footings', '05-18', '05-21'],
      ['Framing', '05-21', '05-29'],
      ['Decking', '06-01', '06-06'],
      ['Railings', '06-08', '06-12'],
      ['Stain and seal', '06-15', '06-17'],
    ].map(([name, start, end]) => ({
      name: name as string,
      phase: null,
      start: `2026-${start}`,
      end: `2026-${end}`,
    }))
    const plain = { ...BASE, group: undefined, baselineStart: undefined, baselineEnd: undefined }
    for (const width of [280, 343, 480, 720]) {
      for (const valueLabels of [true, false]) {
        const { container, unmount } = renderChart({
          ...plain,
          now: undefined,
          data: deck,
          width,
          valueLabels,
        })
        const grid = parts(container, 'gantt-grid')
        expect(grid.length, `${width} px`).toBeGreaterThanOrEqual(3)
        expect(parts(container, 'gantt-tick').length, `${width} px`).toBeGreaterThanOrEqual(2)
        unmount()
      }
    }
    const { container } = renderChart({ width: 343, valueLabels: true })
    expect(parts(container, 'gantt-tick').length).toBeGreaterThanOrEqual(2)
  })

  it('draws fewer than 20 ticks for a schedule from 2024 to 2027', () => {
    const data: Task[] = [
      { name: 'Design', phase: null, start: '2024-01-15', end: '2024-09-01' },
      { name: 'Build', phase: null, start: '2024-09-01', end: '2027-06-30' },
    ]
    const { container } = renderChart({ data, group: undefined })
    const grid = parts(container, 'gantt-grid')
    expect(grid.length).toBeGreaterThan(1)
    expect(grid.length).toBeLessThan(20)
  })

  it('keeps names and draws no bar for rows outside an explicit domain', () => {
    const { container } = renderChart({ domain: ['2026-03-15', '2026-04-19'] })
    for (const name of ['Site protection', 'Demolition', 'Haul-away']) {
      const row = rowByName(container, name)
      expect(row).toBeDefined()
      expect(one(row, 'gantt-bar')).toBeNull()
    }
    for (const { name, value } of attributes(container)) {
      if (['width', 'height'].includes(name)) expect(Number(value)).toBeGreaterThanOrEqual(0)
    }
  })

  it('ignores a reversed or invalid domain with one gantt-domain warning', () => {
    for (const domain of [
      ['2026-04-01', '2026-03-01'],
      ['x', 'y'],
    ]) {
      const spy = quiet()
      const { container, unmount } = renderChart({ domain })
      expect(warnings(spy, 'GanttChart ignored a domain that is not two valid dates')).toHaveLength(
        1,
      )
      const { plotX, scale } = expected(remodel)
      const bar = one(rowByName(container, 'Site protection'), 'gantt-segment')
      expect(num(bar, 'x')).toBeCloseTo(plotX + scale(time('2026-03-02')), 1)
      unmount()
      spy.mockRestore()
    }
  })
})

describe('GanttChart names on top', () => {
  it('moves names above the bars in a 400 px chart', () => {
    const { container } = renderChart({ width: 400 })
    expect(one(container, 'gantt')?.getAttribute('data-ch-labels')).toBe('top')
    const layout = ganttRows(
      remodel.map((d) => d.phase),
      true,
    )
    expect(layout.entries.find((e) => e.row !== null)?.height).toBe(52)
    const drawn = [
      ...container.querySelectorAll('[data-ch-part="gantt-row"], [data-ch-part="gantt-heading"]'),
    ]
    expect(drawn.map(translateY)).toEqual(layout.entries.map((e) => e.y + TICK_ROW))
    const row = rowByName(container, 'Site protection')
    expect(num(one(row, 'gantt-segment'), 'y')).toBe(27)
    const name = one(row, 'gantt-name')
    expect(num(name, 'x')).toBe(0)
    expect(name?.getAttribute('text-anchor') ?? 'start').toBe('start')
    const { plotWidth, scale } = expected(remodel, { width: 400 })
    expect(plotWidth).toBe(400)
    expect(num(one(row, 'gantt-segment'), 'x')).toBeCloseTo(scale(time('2026-03-02')), 1)
  })

  it('keeps a forced position at any width', () => {
    const left = renderChart({ width: 400, labelPosition: 'left' })
    expect(one(left.container, 'gantt')?.getAttribute('data-ch-labels')).toBe('left')
    left.unmount()
    const top = renderChart({ labelPosition: 'top' })
    expect(one(top.container, 'gantt')?.getAttribute('data-ch-labels')).toBe('top')
  })
})

describe('GanttChart rows that cannot be drawn', () => {
  it('skips a null or invalid start, an invalid end and an end before the start', () => {
    const spy = quiet()
    const broken: Task[] = [
      { name: 'No start', phase: 'Prep', start: null, end: '2026-03-05' },
      { name: 'Soon', phase: 'Prep', start: 'soon', end: '2026-03-05' },
      { name: 'Later', phase: 'Finishes', start: '2026-01-05', end: 'later' },
      { name: 'Backwards', phase: 'Finishes', start: '2026-06-10', end: '2026-01-02' },
    ]
    const { container } = renderChart({ data: [...remodel, ...broken] })
    expect(parts(container, 'gantt-row')).toHaveLength(13)
    expect(names(container)).not.toContain('Soon')
    for (const { value } of attributes(container)) expect(value).not.toMatch(/NaN/)
    expect(warnings(spy, 'GanttChart skipped a row with a missing or invalid start')).toHaveLength(
      1,
    )
    // The domain is the same as without them.
    const { plotX, scale } = expected(remodel)
    const bar = one(rowByName(container, 'Site protection'), 'gantt-segment')
    expect(num(bar, 'x')).toBeCloseTo(plotX + scale(time('2026-03-02')), 1)
    expect(parts(container, 'gantt-grid')).toHaveLength(scale.ticks(expected(remodel).count).length)
    spy.mockRestore()
  })

  it('shows the empty state when no row is valid', () => {
    quiet()
    const { container } = renderChart({ data: [{ name: 'A', phase: null, start: null }] })
    expect(one(container, 'empty')).not.toBeNull()
    vi.restoreAllMocks()
  })
})

describe('GanttChart degenerate spans', () => {
  it('draws a single milestone inside the plot', () => {
    const data: Task[] = [{ name: 'Handover', phase: null, start: '2026-05-04' }]
    const { container } = renderChart({ data, group: undefined })
    const diamonds = parts(container, 'gantt-milestone')
    expect(diamonds).toHaveLength(1)
    const { plotX, plotWidth } = expected(data)
    const cx = centreOf(diamonds[0])[0] - plotX
    expect(cx).toBeGreaterThanOrEqual(0)
    expect(cx).toBeLessThanOrEqual(plotWidth)
  })

  it('draws three rows at one instant without NaN', () => {
    const data: Task[] = ['A', 'B', 'C'].map((name) => ({
      name,
      phase: null,
      start: '2026-05-04T12:00Z',
    }))
    const { container } = renderChart({ data, group: undefined })
    expect(parts(container, 'gantt-milestone')).toHaveLength(3)
    for (const { value } of attributes(container)) expect(value).not.toMatch(/NaN|Infinity/)
  })
})

describe('GanttChart baselines that cannot be drawn', () => {
  it('drops half-missing, reversed and invalid baselines with one gantt-baseline warning', () => {
    const spy = quiet()
    const data: Task[] = remodel.map((d) => {
      if (d.name === 'Demolition') return { ...d, plannedEnd: undefined }
      if (d.name === 'Plumbing rough-in')
        return { ...d, plannedStart: '2026-03-18', plannedEnd: '2026-03-13' }
      if (d.name === 'Cabinets') return { ...d, plannedStart: 'x' }
      return d
    })
    const { container } = renderChart({ data })
    expect(warnings(spy, 'GanttChart ignored a baseline that is invalid')).toHaveLength(1)
    for (const name of ['Demolition', 'Plumbing rough-in', 'Cabinets']) {
      const row = rowByName(container, name)
      expect(one(row, 'gantt-baseline')).toBeNull()
      expect(segmentsOf(row).some((s) => s.tone === 'loss')).toBe(false)
    }
    expect(parts(container, 'gantt-baseline')).toHaveLength(8)
    spy.mockRestore()
  })
})

describe('GanttChart layout', () => {
  it('draws no NaN and no negative width, height, x or y at 60 px or at the plot edge', () => {
    // A milestone and its baseline on the domain's start, names on top: the plot's left edge.
    const atEdge = [
      { name: 'Kick-off', phase: null, start: '2026-03-01', plannedStart: '2026-03-01' },
      ...remodel,
    ]
    for (const props of [
      { width: 60 },
      { width: 60, labelPosition: 'left' },
      { data: atEdge, labelPosition: 'top', domain: ['2026-03-01', '2026-04-26'] },
    ]) {
      const { container, unmount } = renderChart(props)
      if (props.data) {
        expect(centreOf(one(rowByName(container, 'Kick-off'), 'gantt-milestone'))[0]).toBe(0)
        expect(one(rowByName(container, 'Kick-off'), 'gantt-milestone-baseline')).not.toBeNull()
      }
      for (const { name, value } of attributes(container)) {
        expect(value).not.toMatch(/NaN|Infinity/)
        if (['width', 'height', 'x', 'y', 'rx'].includes(name)) {
          expect(Number(value)).toBeGreaterThanOrEqual(0)
        }
      }
      unmount()
    }
  })

  it('cuts a 40-character name with an ellipsis and keeps it in one <title>, on the hit rect', () => {
    const long = 'Remove and dispose of the old floor tiles'.slice(0, 40)
    const data = remodel.map((d, i) => (i === 0 ? { ...d, name: long } : d))
    const { container } = renderChart({ data })
    const row = parts(container, 'gantt-row')[0] as Element
    const shown = one(row, 'gantt-name')?.textContent ?? ''
    expect(shown.endsWith('…')).toBe(true)
    expect(shown.length).toBeLessThan(40)
    // The hit rect covers the name, so the native tooltip lives there, once.
    const titles = [...row.querySelectorAll('title')]
    expect(titles).toHaveLength(1)
    expect(titles[0]?.parentElement?.getAttribute('data-ch-part')).toBe('gantt-hit')
    expect(titles[0]?.textContent).toBe(long)
    // A name that fits has none.
    expect(parts(container, 'gantt-row')[1]?.querySelector('title')).toBeNull()
  })
})

describe('GanttChart groups', () => {
  it('draws rows of one group together when they are not adjacent in the data', () => {
    const reordered = [
      remodel[3],
      remodel[0],
      remodel[8],
      remodel[1],
      remodel[4],
      remodel[2],
    ] as Task[]
    const { container } = renderChart({
      data: [...reordered, ...remodel.slice(5).filter((d) => d !== remodel[8])],
    })
    expect(headings(container)).toEqual(['Rough-in', 'Prep', 'Finishes'])
    const drawn = [
      ...container.querySelectorAll('[data-ch-part="gantt-row"], [data-ch-part="gantt-heading"]'),
    ]
    const sequence = drawn.map((el) =>
      el.getAttribute('data-ch-part') === 'gantt-heading'
        ? `# ${el.querySelector('text')?.textContent}`
        : one(el, 'gantt-name')?.textContent,
    )
    const under = (heading: string) => {
      const from = sequence.indexOf(`# ${heading}`) + 1
      const to = sequence.findIndex((s, i) => i >= from && s?.startsWith('# '))
      return sequence.slice(from, to === -1 ? undefined : to).sort()
    }
    expect(under('Prep')).toEqual(['Demolition', 'Haul-away', 'Site protection'])
    expect(under('Rough-in')).toEqual(
      remodel
        .filter((d) => d.phase === 'Rough-in')
        .map((d) => d.name)
        .sort(),
    )
    expect(under('Finishes')).toEqual(
      remodel
        .filter((d) => d.phase === 'Finishes')
        .map((d) => d.name)
        .sort(),
    )
  })

  it('draws rows without a group first, before the first heading', () => {
    const data = [
      ...remodel,
      { name: 'Permit', phase: null, start: '2026-03-01', end: '2026-03-02' },
      { name: 'Insurance', phase: null, start: '2026-03-01', end: '2026-03-02' },
    ]
    const { container } = renderChart({ data })
    const drawn = [
      ...container.querySelectorAll('[data-ch-part="gantt-row"], [data-ch-part="gantt-heading"]'),
    ]
    expect(drawn.slice(0, 3).map((el) => el.getAttribute('data-ch-part'))).toEqual([
      'gantt-row',
      'gantt-row',
      'gantt-heading',
    ])
    expect(names(container).slice(0, 2)).toEqual(['Permit', 'Insurance'])
  })

  it('has no React key warning when a group is named like a task', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const data = remodel.map((d) => (d.phase === 'Prep' ? { ...d, phase: 'Demolition' } : d))
    const { container } = renderChart({ data })
    expect(headings(container)).toEqual(['Demolition', 'Rough-in', 'Finishes'])
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })
})

/** Estimated width of a glyph of 12 px text: `CHAR_WIDTH` is taken at 13 px. */
const CW12 = (CHAR_WIDTH * 12) / 13
/** A value label: its own (muted) text and the text of its overrun tspan. */
const labelOf = (el: Element | null | undefined) => ({
  text: [...(el?.childNodes ?? [])]
    .filter((n) => n.nodeType === 3)
    .map((n) => n.textContent)
    .join('')
    .trim(),
  over: el ? (one(el, 'gantt-over')?.textContent ?? null) : null,
})
const valueLabelOf = (root: Element, name: string) => one(rowByName(root, name), 'gantt-value')
/** A row by its data index, for names cut in a narrow label column (remodel draws in data order). */
const rowAt = (root: Element, index: number) => parts(root, 'gantt-row')[index] as Element
/** Value labels of remodel in row order, as the shared data lists them. */
const LABELS: { text: string; over: string | null }[] = [
  ['2d'],
  ['5d', '+1d'],
  ['1d'],
  ['4d'],
  ['7d', '+2d'],
  ['5d'],
  ['Mar 23', '+3d'],
  ['50%'],
  ['5d'],
  ['3d'],
  ['4d'],
  ['4d'],
  ['Apr 17', '+3d'],
].map(([text, over]) => ({ text: text as string, over: over ?? null }))
const labelWidth = (l: { text: string; over: string | null }) =>
  (l.over ? `${l.text} ${l.over}` : l.text).length * CW12
const WIDEST = Math.max(...LABELS.map(labelWidth))
/** The gutter: the widest label plus its gap, 8 px after a bar and 14 after a milestone's centre. */
const GUTTER = Math.max(...LABELS.map((l, i) => labelWidth(l) + (remodel[i]?.end ? 8 : 14)))

describe('GanttChart value labels', () => {
  it('writes the duration, percent, overrun and milestone date of each row', () => {
    const { container } = renderChart({ valueLabels: true })
    expect(parts(container, 'gantt-value').map(labelOf)).toEqual(LABELS)
    // Every "+Nd" is a gantt-over tspan.
    expect(parts(container, 'gantt-over').map((t) => t.textContent)).toEqual([
      '+1d',
      '+2d',
      '+3d',
      '+3d',
    ])
  })

  it('puts a label 8 px after its bar (14 px after a milestone centre), with the gutter for the widest', () => {
    const { container } = renderChart({ valueLabels: true })
    const plain = expected(remodel)
    const { plotX, plotWidth, scale } = expected(remodel, { valueWidth: GUTTER })
    // The widest labels are the milestones' ("Mar 23 +3d"), 14 px after their centres.
    expect(GUTTER).toBeCloseTo(WIDEST + 14, 5)
    expect(plotWidth).toBeCloseTo(plain.plotWidth - GUTTER, 1)
    for (const d of remodel) {
      const label = valueLabelOf(container, d.name)
      const mark = markOf(d, scale, plotWidth)
      const x = plotX + (mark.milestone ? mark.x + 14 : mark.x + mark.width + 8)
      expect(num(label, 'x')).toBeCloseTo(x, 1)
      expect(label?.getAttribute('data-ch-side')).toBe('right')
      expect(label?.getAttribute('text-anchor') ?? 'start').toBe('start')
    }
    // The bars move with the narrower plot.
    const bar = one(rowByName(container, 'Cabinets'), 'gantt-segment')
    expect(num(bar, 'x')).toBeCloseTo(plotX + scale(time('2026-03-31')), 1)
  })

  it('draws no labels and keeps the full plot with valueLabels={false}', () => {
    const { container } = renderChart()
    expect(parts(container, 'gantt-value')).toHaveLength(0)
    const { plotX, scale } = expected(remodel)
    const [cx] = centreOf(one(rowByName(container, 'Final walkthrough'), 'gantt-milestone'))
    expect(cx).toBeCloseTo(plotX + scale(time('2026-04-17')), 1)
  })

  it('flips a label that would cross the right edge to the left of its mark, inside the chart', () => {
    const domain: [string, string] = ['2026-03-01', '2026-04-17']
    const { container } = renderChart({
      valueLabels: true,
      domain,
      labelPosition: 'left',
      width: 300,
    })
    const { plotX, plotWidth } = expected(remodel, {
      width: 300,
      position: 'left',
      domain,
      valueWidth: GUTTER,
    })
    // The gutter is capped at 25% of the width.
    expect(plotWidth).toBeCloseTo(300 - plotX - Math.min(GUTTER, 75), 1)
    const labels = parts(container, 'gantt-value')
    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      const width = (label.textContent ?? '').length * CW12
      const x = num(label, 'x')
      if (label.getAttribute('data-ch-side') === 'left') {
        expect(label.getAttribute('text-anchor')).toBe('end')
        expect(x - width).toBeGreaterThanOrEqual(plotX)
      } else {
        expect(label.getAttribute('data-ch-side')).toBe('right')
        expect(x + width).toBeLessThanOrEqual(300)
      }
    }
    // The last milestone sits on the plot's right edge: its label goes left of the diamond.
    const walkthrough = one(rowAt(container, 12), 'gantt-value')
    expect(walkthrough?.getAttribute('data-ch-side')).toBe('left')
    const [cx] = centreOf(one(rowAt(container, 12), 'gantt-milestone'))
    expect(num(walkthrough, 'x')).toBeCloseTo(cx - 14, 1)
    for (const { name, value } of attributes(container)) {
      if (name === 'x') expect(Number(value)).toBeGreaterThanOrEqual(0)
    }
  })

  it('keeps the label of a milestone on the last day of the axis', () => {
    // Handover on Apr 19, three days late: the niced axis ends on that Sunday, so the diamond sits
    // on the plot's right edge and its label needs the gutter's 14 px gap.
    const data = remodel.map((d) =>
      d.name === 'Final walkthrough'
        ? { ...d, name: 'Handover', start: '2026-04-19', plannedStart: '2026-04-16' }
        : d,
    )
    for (const width of [720, 343]) {
      const { container, unmount } = renderChart({ data, valueLabels: true, width })
      const { plotX, plotWidth, scale } = expected(data, {
        width,
        valueWidth: GUTTER,
      })
      expect(scale.domain()[1]).toBe(time('2026-04-19'))
      const [cx] = centreOf(one(rowAt(container, 12), 'gantt-milestone'))
      expect(cx).toBeCloseTo(plotX + plotWidth, 1)
      const label = one(rowAt(container, 12), 'gantt-value')
      expect(labelOf(label), `${width} px`).toEqual({ text: 'Apr 19', over: '+3d' })
      if (width === 720) {
        expect(label?.getAttribute('data-ch-side')).toBe('right')
        expect(num(label, 'x')).toBeCloseTo(cx + 14, 1)
        expect(num(label, 'x') + 'Apr 19 +3d'.length * CW12).toBeLessThanOrEqual(720 + 0.01)
      }
      unmount()
    }
  })

  it('starts an early milestone label after its baseline diamond', () => {
    // Two and five days early: the baseline diamond lies right of the milestone, where its label
    // would start; the label starts 14 px after the diamond's centre instead.
    const data = remodel.map((d) =>
      d.name === 'Rough inspection'
        ? { ...d, plannedStart: '2026-03-25' }
        : d.name === 'Final walkthrough'
          ? { ...d, start: '2026-04-12', plannedStart: '2026-04-17' }
          : d,
    )
    const { container } = renderChart({ data, valueLabels: true })
    const half = (8 * Math.SQRT2) / 2
    for (const [index, text] of [
      [6, 'Mar 23 −2d'],
      [12, 'Apr 12 −5d'],
    ] as const) {
      const row = rowAt(container, index)
      const label = one(row, 'gantt-value')
      expect(labelOf(label).text).toBe(text)
      expect(label?.getAttribute('data-ch-side')).toBe('right')
      const [bx] = centreOf(one(row, 'gantt-milestone-baseline'))
      const [cx] = centreOf(one(row, 'gantt-milestone'))
      expect(bx).toBeGreaterThan(cx)
      expect(num(label, 'x')).toBeGreaterThanOrEqual(bx + half)
      expect(num(label, 'x')).toBeCloseTo(bx + 14, 1)
    }
    // A late milestone's baseline is left of it: its label stays 14 px after the diamond.
    const late = rowAt(renderChart({ valueLabels: true }).container, 12)
    const [cx] = centreOf(one(late, 'gantt-milestone'))
    expect(num(one(late, 'gantt-value'), 'x')).toBeCloseTo(cx + 14, 1)
  })

  it('drops a flipped label that would meet its row baseline marker', () => {
    // Ten days late: "Apr 17 +10d" is wider than the capped gutter, and the baseline diamond
    // ten days before the milestone lies under the place the flipped label would take.
    const narrow = (plannedStart: string) =>
      renderChart({
        data: remodel.map((d) => (d.name === 'Final walkthrough' ? { ...d, plannedStart } : d)),
        valueLabels: true,
        domain: ['2026-03-01', '2026-04-17'],
        labelPosition: 'left',
        width: 300,
      }).container
    const late = narrow('2026-04-07')
    expect(one(rowAt(late, 12), 'gantt-milestone')).not.toBeNull()
    expect(one(rowAt(late, 12), 'gantt-value')).toBeNull()
    expect(one(rowAt(late, 6), 'gantt-value')).not.toBeNull()
    // Ten days early: a label as wide, with the baseline right of the diamond, fits on the left.
    const early = narrow('2026-04-27')
    expect(labelOf(one(rowAt(early, 12), 'gantt-value')).text).toBe('Apr 17 −10d')
    expect(one(rowAt(early, 12), 'gantt-value')?.getAttribute('data-ch-side')).toBe('left')
  })

  it('writes an early milestone as "−2d" in the muted text, and no slip under a day', () => {
    const data: Task[] = [
      { name: 'Inspection', phase: null, start: '2026-03-23', plannedStart: '2026-03-25' },
      { name: 'Handover', phase: null, start: '2026-03-30T10:00Z', plannedStart: '2026-03-30' },
      { name: 'Build', phase: null, start: '2026-03-01', end: '2026-03-20' },
    ]
    const { container } = renderChart({ data, group: undefined, valueLabels: true })
    expect(labelOf(valueLabelOf(container, 'Inspection'))).toEqual({
      text: 'Mar 23 −2d',
      over: null,
    })
    expect(labelOf(valueLabelOf(container, 'Handover'))).toEqual({ text: 'Mar 30', over: null })
  })

  it('writes "<1d" for a two-hour task', () => {
    const data: Task[] = [
      { name: 'Quick fix', phase: null, start: '2026-03-10T08:00Z', end: '2026-03-10T10:00Z' },
      { name: 'Long job', phase: null, start: '2026-03-01', end: '2026-04-01' },
    ]
    const { container } = renderChart({ data, group: undefined, valueLabels: true })
    expect(labelOf(valueLabelOf(container, 'Quick fix'))).toEqual({ text: '<1d', over: null })
  })

  it('writes day counts and dates in the provider locale', () => {
    const { container } = renderChart({ valueLabels: true }, { locale: 'pl-PL' })
    const days = new Intl.NumberFormat('pl-PL', {
      style: 'unit',
      unit: 'day',
      unitDisplay: 'narrow',
    })
    expect(labelOf(valueLabelOf(container, 'Demolition'))).toEqual({
      text: days.format(5),
      over: `+${days.format(1)}`,
    })
    const date = createDateFormatter({ month: 'short', day: 'numeric' }, { locale: 'pl-PL' })
    expect(labelOf(valueLabelOf(container, 'Rough inspection')).text).toBe(date(time('2026-03-23')))
  })

  it('reads whole days across a DST change with zone="local"', () => {
    // Local midnights around the spring change of the suite's zone (Europe/Warsaw, Mar 29).
    const start = new Date(2026, 2, 28)
    const end = new Date(2026, 2, 30)
    expect(end.getTime() - start.getTime()).toBe(2 * DAY - 3600e3)
    const data: Task[] = [
      { name: 'Across DST', phase: null, start, end },
      { name: 'Long job', phase: null, start: new Date(2026, 2, 1), end: new Date(2026, 3, 20) },
    ]
    const { container } = renderChart({
      data,
      group: undefined,
      zone: 'local',
      now: undefined,
      valueLabels: true,
    })
    expect(labelOf(valueLabelOf(container, 'Across DST'))).toEqual({ text: '2d', over: null })
  })
})

describe('GanttChart now line', () => {
  it('draws the line at `now` across the rows and the label under them, 28 px taller', () => {
    const { container } = renderChart()
    const { plotX, scale } = expected(remodel)
    const layout = ganttRows(
      remodel.map((d) => d.phase),
      false,
    )
    const line = one(container, 'gantt-now')
    const x = plotX + scale(time(NOW))
    expect(num(line, 'x1')).toBeCloseTo(x, 1)
    expect(num(line, 'x2')).toBeCloseTo(x, 1)
    expect(num(line, 'y1')).toBe(TICK_ROW)
    expect(num(line, 'y2')).toBe(TICK_ROW + layout.height + 6)
    const label = one(container, 'gantt-now-label')
    expect(label?.textContent).toBe('Today · Mar 27')
    expect(label?.getAttribute('text-anchor')).toBe('middle')
    expect(num(label, 'x')).toBeCloseTo(x, 1)
    expect(num(label, 'y')).toBeGreaterThan(TICK_ROW + layout.height)
    expect(num(label, 'y')).toBeLessThanOrEqual(TICK_ROW + layout.height + NOW_ROW)
    const without = renderChart({ now: undefined })
    expect(svgHeight(container)).toBe(svgHeight(without.container) + NOW_ROW)
  })

  it('paints the now line and the grid before the texts that wear the surface halo', () => {
    const before = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    for (const [props, part] of [
      [{ valueLabels: true }, 'gantt-value'],
      [{ valueLabels: true, width: 360 }, 'gantt-value'],
      [{ width: 360 }, 'gantt-name'],
      [{ width: 360 }, 'gantt-heading'],
    ] as const) {
      const { container, unmount } = renderChart(props)
      const first = one(container, part) as Element
      expect(first).not.toBeNull()
      const lines = [one(container, 'gantt-now'), ...parts(container, 'gantt-grid')]
      expect(lines.length).toBeGreaterThan(1)
      for (const line of lines) expect(before(line as Element, first)).toBe(true)
      unmount()
    }
  })

  it('draws neither line nor label for a `now` outside the domain, and keeps the height', () => {
    const { container } = renderChart({ now: '2026-06-01' })
    expect(one(container, 'gantt-now')).toBeNull()
    expect(one(container, 'gantt-now-label')).toBeNull()
    const without = renderChart({ now: undefined })
    expect(svgHeight(container)).toBe(svgHeight(without.container))
    for (const d of remodel.filter((t) => t.end).slice(-4)) {
      expect(segmentsOf(rowByName(container, d.name)).every((s) => s.fill === 'solid')).toBe(true)
    }
  })

  it('fills the `today` message from messages, with the date in {date}', () => {
    const { container } = renderChart({}, { messages: { today: '{date}: dziś' } })
    expect(one(container, 'gantt-now-label')?.textContent).toBe('Mar 27: dziś')
    // A message without {date} shows no date.
    const bare = renderChart({}, { messages: { today: 'Dziś' } })
    expect(one(bare.container, 'gantt-now-label')?.textContent).toBe('Dziś')
  })

  it('keeps the label inside the plot when `now` is next to the domain start', () => {
    const domain: [string, string] = ['2026-03-01', '2026-04-26']
    const { container } = renderChart({ domain, now: '2026-03-02' })
    const { plotX, plotWidth, scale } = expected(remodel, { domain })
    const line = one(container, 'gantt-now')
    expect(num(line, 'x1')).toBeCloseTo(plotX + scale(time('2026-03-02')), 1)
    const label = one(container, 'gantt-now-label')
    const half = ((label?.textContent ?? '').length * CW12) / 2
    expect(num(label, 'x') - half).toBeGreaterThanOrEqual(plotX - 0.01)
    expect(num(label, 'x') + half).toBeLessThanOrEqual(plotX + plotWidth + 0.01)
    expect(num(label, 'x')).toBeGreaterThan(num(line, 'x1'))
  })
})

const keyItems = (root: Element) => parts(root, 'gantt-key-item')
const keyKinds = (root: Element) => keyItems(root).map((el) => el.getAttribute('data-ch-kind'))
const keyTexts = (root: Element) =>
  keyItems(root).map((el) => el.querySelector('text')?.textContent)
const translateX = (el: Element) =>
  Number(el.getAttribute('transform')?.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/)?.[1])
const firstTickY = (root: Element) => num(parts(root, 'gantt-tick')[0], 'y')
const firstRowY = (root: Element) => translateY(parts(root, 'gantt-row')[0] as Element)

describe('GanttChart key', () => {
  it('shows the five kinds of remodel in order and moves everything under it down a line', () => {
    const keyed = renderChart({ legend: true }).container
    expect(keyKinds(keyed)).toEqual(['done', 'planned', 'overrun', 'baseline', 'milestone'])
    expect(keyTexts(keyed)).toEqual(['Done', 'Planned', 'Overrun', 'Baseline', 'Milestone'])
    // One line, items from x 0, each after the previous one's swatch, gap and text, plus 20.
    let x = 0
    keyItems(keyed).forEach((item, i) => {
      expect(translateY(item)).toBe(0)
      expect(translateX(item)).toBeCloseTo(x, 1)
      x += 18 + 6 + (keyTexts(keyed)[i] ?? '').length * CHAR_WIDTH + 20
    })
    const plain = renderChart().container
    expect(firstTickY(keyed)).toBe(firstTickY(plain) + KEY_LINE)
    expect(firstRowY(keyed)).toBe(firstRowY(plain) + KEY_LINE)
    expect(num(one(keyed, 'gantt-grid'), 'y1')).toBe(num(one(plain, 'gantt-grid'), 'y1') + KEY_LINE)
    expect(num(one(keyed, 'gantt-now'), 'y1')).toBe(num(one(plain, 'gantt-now'), 'y1') + KEY_LINE)
    expect(svgHeight(keyed)).toBe(svgHeight(plain) + KEY_LINE)
  })

  it('draws each swatch like its mark', () => {
    const { container } = renderChart({ legend: true, chartId: 'g' })
    const swatch = (kind: string) =>
      keyItems(container)
        .find((el) => el.getAttribute('data-ch-kind') === kind)
        ?.querySelector('rect')
    const done = swatch('done')
    expect([num(done, 'width'), num(done, 'height')]).toEqual([18, 10])
    expect(done?.style.fill).toBe('var(--ch-accent)')
    expect(swatch('planned')?.style.fill).toMatch(/^url\("?#ch-g-hatch-accent"?\)$/)
    expect(swatch('planned')?.getAttribute('data-ch-fill')).toBe('hatch')
    expect(swatch('overrun')?.style.fill).toBe('var(--ch-loss)')
    const baseline = swatch('baseline')
    expect([num(baseline, 'width'), num(baseline, 'height')]).toEqual([18, 3])
    const milestone = swatch('milestone')
    expect(num(milestone, 'width')).toBe(9)
    expect(milestone?.getAttribute('transform')).toMatch(/rotate\(45\)/)
    const text = keyItems(container)[0]?.querySelector('text')
    expect(num(text, 'x')).toBe(24)
  })

  it('draws no key for a plain schedule', () => {
    const { container } = renderChart({
      data: remodel.filter((d) => d.end),
      legend: true,
      now: undefined,
      baselineStart: undefined,
      baselineEnd: undefined,
    })
    expect(one(container, 'gantt-key')).toBeNull()
    expect(firstTickY(container)).toBe(17)
  })

  it('shows done and milestone for tasks and one milestone', () => {
    const { container } = renderChart({
      data: remodel.filter((d) => d.end || d.name === 'Final walkthrough'),
      legend: true,
      now: undefined,
      baselineStart: undefined,
      baselineEnd: undefined,
    })
    expect(keyKinds(container)).toEqual(['done', 'milestone'])
  })

  it('wraps to more lines in a narrow chart and moves the plot down by all of them', () => {
    const keyed = renderChart({ legend: true, width: 300 }).container
    const lines = new Set(keyItems(keyed).map(translateY))
    expect(lines.size).toBeGreaterThan(1)
    expect([...lines].sort((a, b) => a - b)).toEqual([...lines].map((_, i) => i * KEY_LINE))
    for (const item of keyItems(keyed)) {
      const width = 18 + 6 + (item.querySelector('text')?.textContent ?? '').length * CHAR_WIDTH
      expect(translateX(item) + width).toBeLessThanOrEqual(300)
    }
    const plain = renderChart({ width: 300 }).container
    expect(firstRowY(keyed)).toBe(firstRowY(plain) + KEY_LINE * lines.size)
    expect(svgHeight(keyed)).toBe(svgHeight(plain) + KEY_LINE * lines.size)
  })

  it('takes its words from messages', () => {
    const { container } = renderChart({ legend: true }, { messages: { legendDone: 'Gotowe' } })
    expect(keyTexts(container)[0]).toBe('Gotowe')
  })
})

const chartEl = () => screen.getByRole('application', { name: 'Kitchen remodel' })
const live = (root: Element) => root.querySelector('[aria-live]')?.textContent
const press = (root: Element, ...keys: string[]) =>
  keys.map((key) => {
    fireEvent.keyDown(chartEl(), { key })
    return live(root)
  })
const hits = (root: Element) => parts(root, 'gantt-hit')
const hitOf = (root: Element, name: string) => one(rowByName(root, name), 'gantt-hit') as Element
const tooltipOf = (root: Element) => root.querySelector('[data-ch-part="tooltip"]')
const flags = (root: Element, part: string, attr: string) =>
  parts(root, part).map((el) => el.getAttribute(attr) === 'true')
const headers = () =>
  within(screen.getByRole('table'))
    .getAllByRole('columnheader')
    .map((th) => th.textContent)
const tableRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)
const rowText = (row: Element) => ({
  name: within(row as HTMLElement).getByRole('rowheader').textContent,
  cells: within(row as HTMLElement)
    .getAllByRole('cell')
    .map((c) => c.textContent),
})
const tableRowOf = (name: string) =>
  rowText(tableRows().find((r) => rowText(r).name === name) as Element)
const EMPTY = '—no value'

describe('GanttChart keyboard and announcements', () => {
  it('announces each row in drawn order: position, name, range, days, status and overrun', () => {
    const { container } = renderChart()
    fireEvent.focus(chartEl())
    expect(live(container)).toBe('1 of 13, Site protection, Mar 2 – Mar 4, 2 days, done')
    const demolition = '2 of 13, Demolition, Mar 4 – Mar 9, 5 days, done, 1 day over baseline'
    const first = '1 of 13, Site protection, Mar 2 – Mar 4, 2 days, done'
    expect(press(container, 'ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'End')).toEqual([
      demolition,
      first,
      demolition,
      first,
      '13 of 13, Final walkthrough, milestone, Apr 17, upcoming, 3 days late',
    ])
    press(container, 'Home')
    const steps = press(container, ...Array(7).fill('ArrowDown'))
    expect(steps[5]).toBe('7 of 13, Rough inspection, milestone, Mar 23, reached, 3 days late')
    expect(steps[6]).toBe('8 of 13, Drywall and paint, Mar 23 – Mar 31, 8 days, in progress, 50%')
  })

  it('reads a planned task as planned', () => {
    const { container } = renderChart()
    fireEvent.focus(chartEl())
    press(container, 'End')
    expect(press(container, 'ArrowUp')).toEqual([
      '12 of 13, Fixtures and appliances, Apr 12 – Apr 16, 4 days, planned',
    ])
  })

  it('takes the words from ChartsProvider messages and day counts from its locale', () => {
    const { container, unmount } = renderChart(
      {},
      { messages: { statusDone: 'gotowe', overBaseline: '{duration} ponad plan' } },
    )
    fireEvent.focus(chartEl())
    expect(press(container, 'ArrowDown')).toEqual([
      '2 of 13, Demolition, Mar 4 – Mar 9, 5 days, gotowe, 1 day ponad plan',
    ])
    unmount()
    const pl = renderChart({}, { locale: 'pl-PL' })
    fireEvent.focus(chartEl())
    const days = new Intl.NumberFormat('pl-PL', {
      style: 'unit',
      unit: 'day',
      unitDisplay: 'long',
    }).format(5)
    expect(press(pl.container, 'ArrowDown')[0]).toContain(`, ${days}, `)
  })

  it('counts valid rows only: a skipped row has no point, but keeps its table row', () => {
    quiet()
    const data = [
      ...remodel.slice(0, 2),
      { name: 'Broken', phase: 'Prep', start: null },
      ...remodel.slice(2),
    ]
    const { container } = renderChart({ data })
    fireEvent.focus(chartEl())
    expect(live(container)).toBe('1 of 13, Site protection, Mar 2 – Mar 4, 2 days, done')
    expect(hits(container)).toHaveLength(13)
    expect(tableRows()).toHaveLength(14)
    expect(rowText(tableRows()[2] as Element)).toEqual({
      name: 'Broken',
      cells: Array(7).fill(EMPTY),
    })
    vi.restoreAllMocks()
  })

  it('keeps a row outside an explicit domain as a point, anchored at the plot edge', () => {
    const domain = ['2026-03-15', '2026-04-19']
    const { container } = renderChart({ domain })
    const points = registered.at(-1) ?? []
    expect(points).toHaveLength(13)
    for (const p of points) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
    const { plotX } = expected(remodel, { domain: domain as [string, string] })
    expect(points[0]?.x).toBe(plotX)
    fireEvent.focus(chartEl())
    expect(live(container)).toBe('1 of 13, Site protection, Mar 2 – Mar 4, 2 days, done')
  })

  it('warns about repeated ids and does not throw', () => {
    const spy = quiet()
    const { container } = renderChart({ id: (d: Task, i: number) => (i < 2 ? 'same' : d.name) })
    expect(warnings(spy, 'duplicate id')).toHaveLength(1)
    fireEvent.focus(chartEl())
    expect(press(container, 'End')).toEqual([
      '13 of 13, Final walkthrough, milestone, Apr 17, upcoming, 3 days late',
    ])
    spy.mockRestore()
  })
})

describe('GanttChart points', () => {
  it('registers one point per row at the middle of its bar or the diamond centre', () => {
    renderChart()
    const { plotX, plotWidth, scale } = expected(remodel)
    const layout = ganttRows(
      remodel.map((d) => d.phase),
      false,
    )
    const rowEntries = layout.entries.filter((e) => e.row !== null)
    const points = registered.at(-1) ?? []
    expect(points.map((p) => p.id)).toEqual(remodel.map((_, i) => i))
    points.forEach((p, i) => {
      const d = remodel[i] as Task
      const mark = markOf(d, scale, plotWidth)
      const top = TICK_ROW + (rowEntries[i]?.y ?? Number.NaN)
      expect(p.x).toBeCloseTo(plotX + mark.x + mark.width / 2, 1)
      expect(p.y).toBe(top + (mark.milestone ? 16 : 14))
      expect((p.datum as { datum: Task }).datum).toBe(d)
    })
  })

  it('registers the same points array again when re-rendered with the same props', () => {
    const view = () => (
      <GanttChart<Task>
        data={remodel}
        x={(d) => d.name}
        start={(d) => d.start as string}
        end={(d) => d.end as string | undefined}
        group={(d) => d.phase}
        baselineStart={(d) => d.plannedStart as string | undefined}
        baselineEnd={(d) => d.plannedEnd as string | undefined}
        id={(d) => d.name}
        now={NOW}
        domain={['2026-03-01', '2026-04-26']}
        width={720}
        title="Kitchen remodel"
        animate={false}
      />
    )
    const { rerender } = render(view())
    const first = registered.at(-1)
    expect(first).toHaveLength(13)
    rerender(view())
    rerender(view())
    expect(registered.at(-1)).toBe(first)
  })

  it('registers new points when a row changes', () => {
    const chart = (data: Task[]) => {
      const all = { data, ...BASE, width: 720, title: 'R', animate: false }
      return <GanttChart<Task> {...(all as unknown as GanttChartProps<Task>)} />
    }
    const { rerender } = render(chart(remodel))
    const first = registered.at(-1)
    rerender(chart(remodel.map((d, i) => (i === 1 ? { ...d, end: '2026-03-10' } : d))))
    expect(registered.at(-1)).not.toBe(first)
  })
})

describe('GanttChart pointer and tooltip', () => {
  it('covers each row with a hit rect over the names, the plot and the gutter', () => {
    const { container } = renderChart({ valueLabels: true })
    const rects = hits(container)
    expect(rects).toHaveLength(13)
    for (const r of rects) {
      expect([num(r, 'x'), num(r, 'y'), num(r, 'width'), num(r, 'height')]).toEqual([0, 0, 720, 32])
      expect(r.getAttribute('fill')).toBe('transparent')
      expect(r.parentElement?.getAttribute('data-ch-part')).toBe('gantt-row')
      // Last in its row, over the name, the bar and the value label.
      expect(r.parentElement?.lastElementChild).toBe(r)
    }
    expect(parts(container, 'gantt-heading').some((h) => one(h, 'gantt-hit'))).toBe(false)
    const top = renderChart({ width: 400 }).container
    expect(num(hits(top)[0], 'height')).toBe(52)
    expect(num(hits(top)[0], 'width')).toBe(400)
  })

  it('shows the name, range, days, overrun and baseline on hover of a row', () => {
    const { container } = renderChart()
    fireEvent.pointerEnter(hitOf(container, 'Plumbing rough-in'))
    const tip = tooltipOf(container)
    for (const text of [
      'Plumbing rough-in',
      'Mar 14 – Mar 21',
      '7 days',
      '2 days over baseline',
      'baseline Mar 13 – Mar 18',
    ]) {
      expect(tip).toHaveTextContent(text)
    }
    expect(tip).not.toHaveTextContent('done')
    fireEvent.pointerEnter(hitOf(container, 'Drywall and paint'))
    expect(tooltipOf(container)).toHaveTextContent('50% done')
    expect(tooltipOf(container)).toHaveTextContent('baseline Mar 20 – Mar 28')
    fireEvent.pointerEnter(hitOf(container, 'Final walkthrough'))
    const segments = [
      ...(tooltipOf(container)?.querySelectorAll('[data-ch-part="pill-segment"]') ?? []),
    ]
    expect(segments.map((s) => s.textContent)).toEqual([
      'Final walkthrough',
      'Apr 17',
      '3 days late',
    ])
  })

  it('draws no tooltip with tooltip={false}', () => {
    const { container } = renderChart({ tooltip: false })
    fireEvent.pointerEnter(hitOf(container, 'Plumbing rough-in'))
    expect(tooltipOf(container)).toBeNull()
  })

  it('passes the user row to a function tooltip', () => {
    const seen: unknown[] = []
    const { container } = renderChart({
      tooltip: (point: ChartPoint<Task>) => {
        seen.push(point.datum)
        return <span>custom</span>
      },
    })
    fireEvent.pointerEnter(hitOf(container, 'Plumbing rough-in'))
    expect(tooltipOf(container)).toHaveTextContent('custom')
    expect(seen).toContain(remodel[4])
  })

  it('activates the tapped row on touch, and keeps it when the tap ends', () => {
    const { container } = renderChart()
    const row = hits(container)[2] as Element
    fireEvent.pointerEnter(row, { pointerType: 'touch' })
    fireEvent.pointerDown(row, { pointerType: 'touch' })
    fireEvent.pointerLeave(row, {
      pointerType: 'touch',
      relatedTarget: container.querySelector('svg'),
    })
    fireEvent.pointerLeave(container.querySelector('figure') as Element, { pointerType: 'touch' })
    expect(tooltipOf(container)).toHaveTextContent('Haul-away')
    expect(flags(container, 'gantt-row', 'data-ch-active').indexOf(true)).toBe(2)
  })

  it('keeps a row active when the mouse moves to the next row, and clears it off the rows', () => {
    const onActiveChange = vi.fn()
    const { container } = renderChart({ onActiveChange })
    const rects = hits(container)
    fireEvent.pointerEnter(rects[1] as Element, { pointerType: 'mouse' })
    fireEvent.pointerLeave(rects[1] as Element, { pointerType: 'mouse', relatedTarget: rects[2] })
    fireEvent.pointerEnter(rects[2] as Element, { pointerType: 'mouse' })
    expect(tooltipOf(container)).toHaveTextContent('Haul-away')
    expect(onActiveChange.mock.calls.map((c) => c[0])).toEqual([1, 2])
    // Into a heading: the hover ends.
    fireEvent.pointerLeave(rects[2] as Element, {
      pointerType: 'mouse',
      relatedTarget: parts(container, 'gantt-heading')[1],
    })
    expect(tooltipOf(container)).toBeNull()
    expect(container.querySelector('[data-ch-dimmed], [data-ch-active]')).toBeNull()
  })
})

describe('GanttChart selection', () => {
  it('selects on click of a row with the row id and the user row', () => {
    const onSelect = vi.fn()
    const { container, unmount } = renderChart({ onSelect })
    fireEvent.click(hits(container)[2] as Element)
    const [id, point] = onSelect.mock.calls[0] as [unknown, ChartPoint<Task>]
    expect(id).toBe(2)
    expect(point.datum).toBe(remodel[2])
    expect(flags(container, 'gantt-hit', 'data-ch-selectable').every(Boolean)).toBe(true)
    // Headings are not points: no hit rect, nothing to click, never reached by the keyboard.
    fireEvent.click(parts(container, 'gantt-heading')[0] as Element)
    expect(onSelect).toHaveBeenCalledTimes(1)
    fireEvent.focus(chartEl())
    press(container, 'Home', 'Enter')
    expect(onSelect.mock.calls[1]?.[0]).toBe(0)
    unmount()
    const byName = vi.fn()
    const named = renderChart({ onSelect: byName, id: 'name' })
    fireEvent.click(hits(named.container)[1] as Element)
    expect(byName.mock.calls[0]?.[0]).toBe('Demolition')
  })

  it('marks nothing selectable without onSelect', () => {
    const { container } = renderChart()
    expect(container.querySelector('[data-ch-selectable]')).toBeNull()
  })
})

describe('GanttChart active row', () => {
  const others = (n: number, at: number) => Array.from({ length: n }, (_, i) => i !== at)

  it('dims the other rows bars, baselines and diamonds, and marks the active row', () => {
    const { container } = renderChart({ activeId: 2 })
    // Haul-away is the third of 11 bars and baselines; both diamonds belong to other rows.
    expect(flags(container, 'gantt-bar', 'data-ch-dimmed')).toEqual(others(11, 2))
    expect(flags(container, 'gantt-baseline', 'data-ch-dimmed')).toEqual(others(11, 2))
    expect(flags(container, 'gantt-milestone', 'data-ch-dimmed')).toEqual([true, true])
    expect(flags(container, 'gantt-milestone-baseline', 'data-ch-dimmed')).toEqual([true, true])
    expect(flags(container, 'gantt-row', 'data-ch-active')).toEqual(
      Array.from({ length: 13 }, (_, i) => i === 2),
    )
    // Text is never dimmed.
    expect(container.querySelector('text[data-ch-dimmed], tspan[data-ch-dimmed]')).toBeNull()
  })

  it('dims nothing with dimInactive={false}, and still marks the active row', () => {
    const { container } = renderChart({ activeId: 2, dimInactive: false })
    expect(container.querySelector('[data-ch-dimmed]')).toBeNull()
    expect(flags(container, 'gantt-row', 'data-ch-active').indexOf(true)).toBe(2)
  })

  it('never changes the segments', () => {
    const geometry = (props: Props) =>
      parts(renderChart(props).container, 'gantt-segment').map((s) =>
        ['x', 'y', 'width', 'height'].map((a) => s.getAttribute(a)).join(),
      )
    expect(geometry({ activeId: 2 })).toEqual(geometry({}))
  })
})

describe('GanttChart data table', () => {
  it('lists every row in data order: name, phase, dates, baseline, progress and status', () => {
    renderChart()
    expect(headers()).toEqual([
      'Name',
      'Phase',
      'Start',
      'End',
      'Baseline start',
      'Baseline end',
      'Progress',
      'Status',
    ])
    const rows = tableRows()
    expect(rows.map((r) => rowText(r).name)).toEqual(remodel.map((d) => d.name))
    expect(tableRowOf('Drywall and paint')).toEqual({
      name: 'Drywall and paint',
      cells: [
        'Rough-in',
        'Mar 23, 2026',
        'Mar 31, 2026',
        'Mar 20, 2026',
        'Mar 28, 2026',
        '50%',
        'in progress',
      ],
    })
    expect(tableRowOf('Final walkthrough')).toEqual({
      name: 'Final walkthrough',
      cells: [
        'Finishes',
        'Apr 17, 2026',
        EMPTY,
        'Apr 14, 2026',
        EMPTY,
        EMPTY,
        'milestone, upcoming',
      ],
    })
    expect(tableRowOf('Site protection').cells.slice(-2)).toEqual(['100%', 'done'])
    expect(tableRowOf('Cabinets').cells.slice(-2)).toEqual(['0%', 'planned'])
    expect(tableRowOf('Rough inspection').cells.at(-1)).toBe('milestone, reached')
  })

  it('leaves out the group and baseline columns without those accessors', () => {
    renderChart({ group: undefined, baselineStart: undefined, baselineEnd: undefined })
    expect(headers()).toEqual(['Name', 'Start', 'End', 'Progress', 'Status'])
  })

  it('renames columns with dataTable.columns, and drops the table with dataTable={false}', () => {
    const { unmount } = renderChart({ dataTable: { columns: { Start: 'Starts' } } })
    expect(headers()[2]).toBe('Starts')
    unmount()
    renderChart({ dataTable: false })
    expect(screen.queryByRole('table')).toBeNull()
  })
})
