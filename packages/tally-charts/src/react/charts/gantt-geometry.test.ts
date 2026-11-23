import { describe, expect, it } from 'vitest'
import { DAY, timeScale } from '../../core/time'
import { doneShare, type GanttItem, ganttColumns, ganttMark, ganttRows } from './gantt-geometry'

const day = (month: number, date: number): number => Date.UTC(2026, month - 1, date)
const mar = (date: number): number => day(3, date)
const scale = (ms: number): number => ((ms - mar(1)) / DAY) * 10
const PLOT = 490

const task = (over: Partial<GanttItem> & Pick<GanttItem, 'start' | 'end'>): GanttItem => ({
  baselineStart: null,
  baselineEnd: null,
  done: 1,
  ...over,
})

describe('doneShare', () => {
  it('lets progress win over now, clamped to 0-1', () => {
    expect(doneShare(mar(2), mar(4), 0.4, mar(10))).toBe(0.4)
    expect(doneShare(mar(2), mar(4), 2, undefined)).toBe(1)
    expect(doneShare(mar(2), mar(4), -1, undefined)).toBe(0)
  })

  it('falls back to now when progress is not finite', () => {
    expect(doneShare(mar(2), mar(4), Number.NaN, mar(3))).toBe(0.5)
    expect(doneShare(mar(2), mar(4), undefined, mar(3))).toBe(0.5)
  })

  it('reads now at the end as done and at the start as planned', () => {
    expect(doneShare(mar(2), mar(4), undefined, mar(4))).toBe(1)
    expect(doneShare(mar(2), mar(4), undefined, mar(2))).toBe(0)
    expect(doneShare(mar(2), mar(4), undefined, mar(20))).toBe(1)
    expect(doneShare(mar(2), mar(4), undefined, mar(1))).toBe(0)
  })

  it('is 1 with neither', () => {
    expect(doneShare(mar(2), mar(4), undefined, undefined)).toBe(1)
  })
})

describe('ganttMark', () => {
  it('draws a task that matches its baseline as one solid segment', () => {
    const mark = ganttMark(
      task({ start: mar(2), end: mar(4), baselineStart: mar(2), baselineEnd: mar(4) }),
      scale,
      PLOT,
    )
    expect(mark).toMatchObject({
      milestone: false,
      x: 10,
      width: 20,
      overMs: 0,
      visible: true,
      baseline: { x: 10, width: 20 },
      segments: [{ x: 10, width: 20, over: false, fill: 'solid' }],
    })
  })

  it('draws a finished task as one segment when the done point lands a float step past the end', () => {
    // Mar 1 – Apr 19 over 479 px: x0 + 1 × (x1 − x0) is 29.326530612244902, x1 29.3265306122449.
    const real = timeScale([mar(1), day(4, 19)], [0, 479], 'utc')
    const x0 = real(mar(2))
    const x1 = real(mar(4))
    expect(x0 + 1 * (x1 - x0)).toBeGreaterThan(x1)
    const mark = ganttMark(
      task({ start: mar(2), end: mar(4), baselineStart: mar(2), baselineEnd: mar(4) }),
      real,
      479,
    )
    expect(mark.segments).toEqual([{ x: mark.x, width: mark.width, over: false, fill: 'solid' }])
  })

  it('never draws a segment of width 0 with a real time scale', () => {
    // The remodel's Site protection (no overrun) and Demolition (a day over), done, at every width.
    for (let width = 300; width <= 900; width++) {
      const real = timeScale([mar(1), day(4, 19)], [0, width], 'utc')
      const site = ganttMark(
        task({ start: mar(2), end: mar(4), baselineStart: mar(2), baselineEnd: mar(4) }),
        real,
        width,
      )
      const demolition = ganttMark(
        task({ start: mar(4), end: mar(9), baselineStart: mar(4), baselineEnd: mar(8) }),
        real,
        width,
      )
      expect(site.segments.map((s) => s.over)).toEqual([false])
      expect(demolition.segments.map((s) => s.over)).toEqual([false, true])
      for (const s of [...site.segments, ...demolition.segments]) {
        expect(s.width).toBeGreaterThan(0)
      }
    }
  })

  it('marks the overrun at the end of a finished task', () => {
    const mark = ganttMark(
      task({ start: mar(4), end: mar(9), baselineStart: mar(4), baselineEnd: mar(8) }),
      scale,
      PLOT,
    )
    expect(mark.x).toBe(30)
    expect(mark.width).toBe(50)
    expect(mark.overMs).toBe(DAY)
    expect(mark.segments).toEqual([
      { x: 30, width: 40, over: false, fill: 'solid' },
      { x: 70, width: 10, over: true, fill: 'solid' },
    ])
  })

  it('splits a running task into solid and hatch, with the baseline apart', () => {
    const mark = ganttMark(
      task({
        start: mar(23),
        end: mar(31),
        baselineStart: mar(20),
        baselineEnd: mar(28),
        done: 0.5,
      }),
      scale,
      PLOT,
    )
    expect(mark.x).toBe(220)
    expect(mark.width).toBe(80)
    expect(mark.baseline).toEqual({ x: 190, width: 80 })
    expect(mark.segments).toEqual([
      { x: 220, width: 40, over: false, fill: 'solid' },
      { x: 260, width: 40, over: false, fill: 'hatch' },
    ])
  })

  it('draws a planned task with an overrun as hatch, hatch over', () => {
    const mark = ganttMark(
      task({ start: mar(10), end: mar(15), baselineStart: mar(10), baselineEnd: mar(13), done: 0 }),
      scale,
      PLOT,
    )
    expect(mark.overMs).toBe(2 * DAY)
    expect(mark.segments).toEqual([
      { x: 90, width: 30, over: false, fill: 'hatch' },
      { x: 120, width: 20, over: true, fill: 'hatch' },
    ])
  })

  it('splits again when the done share ends inside the overrun', () => {
    const mark = ganttMark(
      task({
        start: mar(10),
        end: mar(15),
        baselineStart: mar(10),
        baselineEnd: mar(13),
        done: 0.8,
      }),
      scale,
      PLOT,
    )
    expect(mark.segments).toEqual([
      { x: 90, width: 30, over: false, fill: 'solid' },
      { x: 120, width: 10, over: true, fill: 'solid' },
      { x: 130, width: 10, over: true, fill: 'hatch' },
    ])
  })

  it('has no overrun for a late start with an equal duration', () => {
    const mark = ganttMark(
      task({ start: mar(10), end: mar(13), baselineStart: mar(5), baselineEnd: mar(8) }),
      scale,
      PLOT,
    )
    expect(mark.overMs).toBe(0)
    expect(mark.segments.every((s) => !s.over)).toBe(true)
  })

  it('has no overrun, and nothing negative, for a baseline longer than the task', () => {
    const mark = ganttMark(
      task({ start: mar(10), end: mar(12), baselineStart: mar(10), baselineEnd: mar(15) }),
      scale,
      PLOT,
    )
    expect(mark.overMs).toBe(0)
    expect(mark.segments).toEqual([{ x: 90, width: 20, over: false, fill: 'solid' }])
    expect(mark.baseline).toEqual({ x: 90, width: 50 })
  })

  it('draws a milestone as a point with its baseline centre', () => {
    const mark = ganttMark(
      { start: mar(23), end: null, baselineStart: mar(20), baselineEnd: null, done: 1 },
      scale,
      PLOT,
    )
    expect(mark).toMatchObject({
      milestone: true,
      x: 220,
      width: 0,
      segments: [],
      baseline: { x: 190, width: 0 },
      visible: true,
    })
  })

  it('hides a milestone outside the plot and its baseline when outside', () => {
    const out = ganttMark(
      { start: day(2, 20), end: null, baselineStart: mar(5), baselineEnd: null, done: 0 },
      scale,
      PLOT,
    )
    expect(out.visible).toBe(false)
    expect(out.baseline).toEqual({ x: 40, width: 0 })
    const noBaseline = ganttMark(
      { start: mar(5), end: null, baselineStart: day(2, 1), baselineEnd: null, done: 0 },
      scale,
      PLOT,
    )
    expect(noBaseline.visible).toBe(true)
    expect(noBaseline.baseline).toBeNull()
  })

  it('clips a task that starts before the plot', () => {
    const mark = ganttMark(task({ start: day(2, 20), end: mar(5) }), scale, PLOT)
    expect(mark.x).toBe(0)
    expect(mark.width).toBe(40)
    expect(mark.visible).toBe(true)
    expect(mark.segments).toEqual([{ x: 0, width: 40, over: false, fill: 'solid' }])
  })

  it('marks a task wholly outside as not visible, without segments', () => {
    const mark = ganttMark(task({ start: day(2, 10), end: day(2, 20) }), scale, PLOT)
    expect(mark.visible).toBe(false)
    expect(mark.segments).toEqual([])
    const after = ganttMark(task({ start: day(5, 1), end: day(5, 3) }), scale, PLOT)
    expect(after.visible).toBe(false)
  })

  it('drops a baseline wholly outside the plot', () => {
    const mark = ganttMark(
      task({ start: mar(5), end: mar(8), baselineStart: day(2, 1), baselineEnd: day(2, 10) }),
      scale,
      PLOT,
    )
    expect(mark.baseline).toBeNull()
    expect(mark.visible).toBe(true)
  })

  it('clips a baseline that reaches past the plot', () => {
    const mark = ganttMark(
      task({ start: mar(5), end: mar(8), baselineStart: mar(1) - 5 * DAY, baselineEnd: mar(5) }),
      scale,
      PLOT,
    )
    expect(mark.baseline).toEqual({ x: 0, width: 40 })
  })

  it('widens a two-hour task to 2 px with one segment', () => {
    const mark = ganttMark(task({ start: mar(5), end: mar(5) + 2 * 3600e3 }), scale, PLOT)
    expect(mark.width).toBe(2)
    expect(mark.x).toBe(40)
    expect(mark.visible).toBe(true)
    expect(mark.segments).toEqual([{ x: 40, width: 2, over: false, fill: 'solid' }])
    const planned = ganttMark(
      task({ start: mar(5), end: mar(5) + 2 * 3600e3, done: 0 }),
      scale,
      PLOT,
    )
    expect(planned.segments).toEqual([{ x: 40, width: 2, over: false, fill: 'hatch' }])
  })

  it('keeps the minimum width inside the plot', () => {
    const mark = ganttMark(task({ start: mar(50), end: mar(50) + 3600e3 }), scale, PLOT)
    expect(mark.x).toBe(488)
    expect(mark.width).toBe(2)
  })

  it('never returns NaN for a scale that returns NaN or a zero plot', () => {
    const nan = ganttMark(task({ start: mar(2), end: mar(4) }), () => Number.NaN, PLOT)
    expect(nan.visible).toBe(false)
    expect(nan.segments).toEqual([])
    const zero = ganttMark(task({ start: mar(2), end: mar(4) }), scale, 0)
    expect(zero.visible).toBe(false)
    expect(zero.segments).toEqual([])
    for (const m of [nan, zero]) {
      expect(JSON.stringify(m)).not.toContain('null,"width"')
      expect(Number.isNaN(m.x)).toBe(false)
      expect(Number.isNaN(m.width)).toBe(false)
      expect(Number.isNaN(m.overMs)).toBe(false)
    }
  })
})

describe('ganttRows', () => {
  it('puts a heading above each group', () => {
    const { entries, height } = ganttRows(['Prep', 'Prep', 'Finishes'], false)
    expect(entries).toEqual([
      { row: null, heading: 'Prep', groupIndex: 0, y: 0, height: 32 },
      { row: 0, heading: null, groupIndex: null, y: 32, height: 32 },
      { row: 1, heading: null, groupIndex: null, y: 64, height: 32 },
      { row: null, heading: 'Finishes', groupIndex: 1, y: 96, height: 32 },
      { row: 2, heading: null, groupIndex: null, y: 128, height: 32 },
    ])
    expect(height).toBe(160)
  })

  it('makes rows 52 high with names on top', () => {
    const { entries, height } = ganttRows(['Prep', 'Prep'], true)
    expect(entries.map((e) => [e.y, e.height])).toEqual([
      [0, 32],
      [32, 52],
      [84, 52],
    ])
    expect(height).toBe(136)
  })

  it('draws the rows of a group together, in order of first appearance', () => {
    const { entries } = ganttRows(['A', 'B', 'A'], false)
    expect(entries.map((e) => e.heading ?? e.row)).toEqual(['A', 0, 2, 'B', 1])
  })

  it('draws ungrouped rows first, without a heading', () => {
    const { entries } = ganttRows([null, 'A', null], false)
    expect(entries.map((e) => e.heading ?? e.row)).toEqual([0, 2, 'A', 1])
    expect(entries[0]!.y).toBe(0)
  })

  it('has no headings when no row has a group', () => {
    const { entries, height } = ganttRows([null, null, null], false)
    expect(entries.map((e) => e.row)).toEqual([0, 1, 2])
    expect(entries.every((e) => e.heading === null)).toBe(true)
    expect(height).toBe(96)
  })

  it('handles no rows', () => {
    expect(ganttRows([], false)).toEqual({ entries: [], height: 0 })
  })
})

describe('ganttColumns', () => {
  const base = { width: 720, nameWidth: 161, valueWidth: 70, position: 'auto' } as const

  it('puts names on the left from 480 px, with a label column and a gutter', () => {
    expect(ganttColumns(base)).toEqual({ top: false, plotX: 173, plotWidth: 720 - 173 - 78 })
  })

  it('clamps the label column to 96-220', () => {
    expect(ganttColumns({ ...base, nameWidth: 400 }).plotX).toBe(220)
    expect(ganttColumns({ ...base, nameWidth: 20 }).plotX).toBe(96)
  })

  it('moves names on top below 480 px', () => {
    const cols = ganttColumns({ ...base, width: 479 })
    expect(cols.top).toBe(true)
    expect(cols.plotX).toBe(0)
    expect(cols.plotWidth).toBe(479 - 78)
    expect(ganttColumns({ ...base, width: 480 }).top).toBe(false)
  })

  it('forces a position', () => {
    expect(ganttColumns({ ...base, width: 300, position: 'left' })).toMatchObject({
      top: false,
      plotX: 120,
    })
    expect(ganttColumns({ ...base, width: 900, position: 'top' })).toMatchObject({
      top: true,
      plotX: 0,
    })
  })

  it('caps the gutter at 96 and has none without value labels', () => {
    expect(ganttColumns({ ...base, valueWidth: 200 }).plotWidth).toBe(720 - 173 - 96)
    expect(ganttColumns({ ...base, valueWidth: 0 }).plotWidth).toBe(720 - 173)
  })

  it('caps the gutter at 25% of the width', () => {
    expect(ganttColumns({ ...base, width: 200, valueWidth: 90, position: 'top' }).plotWidth).toBe(
      150,
    )
  })

  it('never goes negative', () => {
    for (const position of ['auto', 'left', 'top'] as const) {
      const cols = ganttColumns({ width: 60, nameWidth: 300, valueWidth: 300, position })
      expect(cols.plotX).toBeGreaterThanOrEqual(0)
      expect(cols.plotWidth).toBeGreaterThanOrEqual(0)
    }
    expect(ganttColumns({ ...base, width: 0 }).plotWidth).toBe(0)
  })
})
