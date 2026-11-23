import { round2 } from '../../core/path'

/** Share of a task that is done, 0–1. `progress` wins over `now`; without either it is 1. */
export function doneShare(
  start: number,
  end: number,
  progress: number | undefined,
  now: number | undefined,
): number {
  if (progress !== undefined && Number.isFinite(progress)) return Math.min(1, Math.max(0, progress))
  if (now === undefined || !Number.isFinite(now)) return 1
  if (end <= now) return 1
  if (start >= now) return 0
  return (now - start) / (end - start)
}

export interface GanttItem {
  start: number
  /** null for a milestone. */
  end: number | null
  /** A valid baseline (end after start for a task), or nulls. A milestone has only the start. */
  baselineStart: number | null
  baselineEnd: number | null
  /** 0–1; for a milestone 1 when reached, else 0. */
  done: number
}

export interface GanttSegment {
  x: number
  width: number
  over: boolean
  fill: 'solid' | 'hatch'
}

export interface GanttMark {
  milestone: boolean
  /** Bar start, or the diamond's centre, in plot px. */
  x: number
  /** 0 for a milestone. */
  width: number
  /** Left to right, touching, covering the bar. Empty for a milestone. */
  segments: GanttSegment[]
  /** Baseline line, or a milestone's baseline centre with width 0. Null when absent or outside the plot. */
  baseline: { x: number; width: number } | null
  /** Overrun in ms (duration minus baseline duration), 0 when none or no baseline. */
  overMs: number
  /** False when the row is wholly outside [0, plotWidth]. */
  visible: boolean
}

const MIN_BAR = 2

/** A task's duration minus its baseline's, never negative; 0 for a milestone or without a baseline. */
export function ganttOverrun(item: GanttItem): number {
  const { start, end, baselineStart, baselineEnd } = item
  if (end === null || baselineStart === null || baselineEnd === null) return 0
  return Math.max(0, end - start - (baselineEnd - baselineStart))
}

const hidden = (milestone: boolean): GanttMark => ({
  milestone,
  x: 0,
  width: 0,
  segments: [],
  baseline: null,
  overMs: 0,
  visible: false,
})

export function ganttMark(
  item: GanttItem,
  scale: (ms: number) => number,
  plotWidth: number,
): GanttMark {
  const { start, end, baselineStart, baselineEnd } = item
  const milestone = end === null
  if (!(plotWidth > 0)) return hidden(milestone)
  const clip = (v: number): number => Math.min(plotWidth, Math.max(0, v))
  const hasBaseline = baselineStart !== null && baselineEnd !== null

  if (end === null) {
    const x = scale(start)
    if (!Number.isFinite(x)) return hidden(true)
    let baseline: GanttMark['baseline'] = null
    if (baselineStart !== null) {
      const bx = scale(baselineStart)
      if (Number.isFinite(bx) && bx >= 0 && bx <= plotWidth) baseline = { x: round2(bx), width: 0 }
    }
    return {
      milestone: true,
      x: round2(x),
      width: 0,
      segments: [],
      baseline,
      overMs: 0,
      visible: x >= 0 && x <= plotWidth,
    }
  }

  const x0 = scale(start)
  const x1 = scale(end)
  if (!Number.isFinite(x0) || !Number.isFinite(x1)) return hidden(false)

  let baseline: GanttMark['baseline'] = null
  if (hasBaseline) {
    const b0 = scale(baselineStart)
    const b1 = scale(baselineEnd)
    if (Number.isFinite(b0) && Number.isFinite(b1) && b1 >= 0 && b0 <= plotWidth) {
      baseline = { x: round2(clip(b0)), width: round2(clip(b1) - clip(b0)) }
    }
  }
  const overMs = ganttOverrun(item)

  if (x1 < 0 || x0 > plotWidth) return { ...hidden(false), baseline, overMs }

  const cx0 = clip(x0)
  const cx1 = clip(x1)
  if (cx1 - cx0 < MIN_BAR) {
    const x = Math.max(0, Math.min(cx0, plotWidth - MIN_BAR))
    const over = overMs > 0
    return {
      milestone: false,
      x: round2(x),
      width: MIN_BAR,
      segments: [
        { x: round2(x), width: MIN_BAR, over, fill: item.done >= 0.5 ? 'solid' : 'hatch' },
      ],
      baseline,
      overMs,
      visible: true,
    }
  }

  const doneX = x0 + item.done * (x1 - x0)
  const overPx = overMs > 0 ? scale(start + overMs) - x0 : 0
  const overX = overMs > 0 && Number.isFinite(overPx) ? x1 - overPx : x1
  const points = [x0, doneX, overX, x1].map(clip).sort((a, b) => a - b)
  const segments: GanttSegment[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i]!
    const to = points[i + 1]!
    if (to - from <= 0) continue
    const mid = (from + to) / 2
    segments.push({
      x: round2(from),
      width: round2(to - from),
      over: overMs > 0 && mid >= clip(overX),
      fill: mid <= clip(doneX) ? 'solid' : 'hatch',
    })
  }
  return {
    milestone: false,
    x: round2(cx0),
    width: round2(cx1 - cx0),
    segments,
    baseline,
    overMs,
    visible: true,
  }
}

export interface GanttEntry {
  /** Index into the `groups` argument for a row; null for a heading. */
  row: number | null
  /** Group name for a heading; null for a row. */
  heading: string | null
  /** Index of the group among headings, for keys; null for a row. */
  groupIndex: number | null
  y: number
  height: number
}

const ROW = 32
const ROW_TOP = 52
const HEADING = 32

/** Drawn order: ungrouped rows first, then each group (order of first appearance) under a heading. */
export function ganttRows(
  groups: readonly (string | null)[],
  top: boolean,
): { entries: GanttEntry[]; height: number } {
  const rowHeight = top ? ROW_TOP : ROW
  const entries: GanttEntry[] = []
  let y = 0
  const row = (index: number): void => {
    entries.push({ row: index, heading: null, groupIndex: null, y, height: rowHeight })
    y += rowHeight
  }
  const members = new Map<string, number[]>()
  groups.forEach((group, index) => {
    if (group === null) row(index)
    else if (members.has(group)) members.get(group)!.push(index)
    else members.set(group, [index])
  })
  let groupIndex = 0
  for (const [name, rows] of members) {
    entries.push({ row: null, heading: name, groupIndex, y, height: HEADING })
    y += HEADING
    groupIndex++
    rows.forEach(row)
  }
  return { entries, height: y }
}

export function ganttColumns(input: {
  width: number
  /** Estimated width of the widest name or group name. */
  nameWidth: number
  /** Estimated width of the widest value label; 0 without value labels. */
  valueWidth: number
  position: 'auto' | 'left' | 'top'
}): { top: boolean; plotX: number; plotWidth: number } {
  const width = Math.max(0, input.width)
  const top = input.position === 'top' || (input.position === 'auto' && width < 480)
  const label = top ? 0 : Math.min(Math.min(220, Math.max(96, input.nameWidth + 12)), width * 0.4)
  const gutter = input.valueWidth > 0 ? Math.min(input.valueWidth + 8, 96, width * 0.25) : 0
  return {
    top,
    plotX: round2(label),
    plotWidth: round2(Math.max(0, width - label - gutter)),
  }
}
