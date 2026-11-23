import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { autoTickLabels } from '../../core/date'
import { CHAR_WIDTH } from '../../core/text'
import { estimateWidth, type Tick, thinTicks } from '../../core/ticks'
import { inferTimeDomain, niceTimeDomain, type TimeScale, timeScale, toTime } from '../../core/time'
import { GanttChart, type GanttChartProps } from './GanttChart'
import { doneShare, ganttColumns, ganttMark, ganttRows } from './gantt-geometry'

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

/** A 720 px chart of `remodel` without value labels or key, unless `props` says otherwise. */
function renderChart(props: Props = {}) {
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
  return render(<GanttChart<Task> {...all} />)
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
  }: { width?: number; position?: 'auto' | 'left' | 'top'; domain?: [string, string] } = {},
) {
  const widest = Math.max(
    ...data.flatMap((d) => [d.name, d.phase ?? ''].map((t) => t.length * CHAR_WIDTH)),
  )
  const cols = ganttColumns({ width, nameWidth: widest, valueWidth: 0, position })
  const count = Math.max(2, Math.round(cols.plotWidth / 100))
  const times = data.flatMap((d) =>
    [d.start, d.end, d.plannedStart, d.plannedEnd].filter((v) => v != null).map(time),
  )
  const range: [number, number] = domain
    ? [time(domain[0]), time(domain[1])]
    : niceTimeDomain(inferTimeDomain(times), 'utc', count)
  const scale = timeScale(range, [0, cols.plotWidth], 'utc')
  return { ...cols, count, scale }
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
    expect(svgHeight(container)).toBe(TICK_ROW + layout.height)
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
    const labels = autoTickLabels(values, { zone: 'utc' })
    const ticks: Tick[] = values.map((v, i) => ({
      value: v,
      position: scale(v) + 6,
      label: labels[i] ?? '',
      anchor: 'start',
    }))
    const kept = thinTicks(ticks, estimateWidth).filter(
      (t) => plotX + t.position + estimateWidth(t) <= 720,
    )
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

  it('cuts a 40-character name with an ellipsis and keeps it in a <title>', () => {
    const long = 'Remove and dispose of the old floor tiles'.slice(0, 40)
    const data = remodel.map((d, i) => (i === 0 ? { ...d, name: long } : d))
    const { container } = renderChart({ data })
    const name = parts(container, 'gantt-name')[0]
    const shown = [...(name?.childNodes ?? [])]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent)
      .join('')
    expect(shown.endsWith('…')).toBe(true)
    expect(shown.length).toBeLessThan(40)
    expect(name?.querySelector('title')?.textContent).toBe(long)
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
