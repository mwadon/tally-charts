import type { LinearScale } from './linear'
import { toNumber } from './number'

export interface DotBinInput {
  values: readonly unknown[]
  x: LinearScale
  /** Bin width in data units. A missing or non-positive width falls back to a fortieth of the domain. */
  binWidth: number
  /** y of the stacks' bottom edge, in px. */
  baseline: number
  /** Highest y the tallest stack may reach, in px. */
  top: number
  /** Default 6. */
  maxRadius?: number
  /** Default 2. */
  minRadius?: number
  /** Space between dots in px. Default 2. */
  gap?: number
}

export interface BinnedDot {
  /** Index in `values`. */
  index: number
  value: number
  bin: number
  /** 0 is the bottom of the stack. */
  stack: number
  cx: number
  cy: number
}

export interface DotBinLayout {
  dots: BinnedDot[]
  radius: number
  /**
   * True when the dots had to shrink to `minRadius`. The stacks are then compressed so they fit:
   * dots overlap, and the plot never overflows.
   */
  crowded: boolean
}

function clampTo(scale: LinearScale) {
  const [r0, r1] = scale.range()
  const lo = Math.min(r0, r1)
  const hi = Math.max(r0, r1)
  return (px: number) => Math.min(hi, Math.max(lo, px))
}

/** One dot per value, binned on x and stacked upward (dot histograms). */
export function binDots(input: DotBinInput): DotBinLayout {
  const { x, baseline, top } = input
  const maxRadius = input.maxRadius ?? 6
  const minRadius = input.minRadius ?? 2
  const gap = input.gap ?? 2
  const [d0, d1] = x.domain()
  const lo = Math.min(d0, d1)
  const hi = Math.max(d0, d1)
  const width =
    Number.isFinite(input.binWidth) && input.binWidth > 0 ? input.binWidth : (hi - lo) / 40 || 1
  const binCount = Math.max(1, Math.ceil((hi - lo) / width))
  const items = input.values.flatMap((raw, index) => {
    const value = toNumber(raw)
    if (!Number.isFinite(value)) return []
    const bin = Math.min(binCount - 1, Math.max(0, Math.floor((value - lo) / width)))
    return [{ index, value, bin }]
  })
  items.sort((a, b) => a.bin - b.bin || a.value - b.value || a.index - b.index)
  const heights = new Map<number, number>()
  const stacked = items.map((item) => {
    const stack = heights.get(item.bin) ?? 0
    heights.set(item.bin, stack + 1)
    return { ...item, stack }
  })
  const tallest = Math.max(0, ...heights.values())
  const binPx = Math.abs(x(lo + width) - x(lo))
  const fitX = binPx / 2 - gap / 2
  const fitY = tallest > 0 ? Math.abs(baseline - top) / tallest / 2 - gap / 2 : maxRadius
  const ideal = Math.min(maxRadius, fitX, fitY)
  const crowded = !(ideal >= minRadius)
  const radius = crowded ? minRadius : ideal
  const clamp = clampTo(x)
  const step = 2 * radius + gap
  // Crowded stacks squeeze together (and overlap) so the tallest still ends at `top`.
  const pitch =
    crowded && tallest > 1
      ? Math.max(0, Math.min(step, (Math.abs(baseline - top) - 2 * radius) / (tallest - 1)))
      : step
  return {
    radius,
    crowded,
    dots: stacked.map((d) => ({
      index: d.index,
      value: d.value,
      bin: d.bin,
      stack: d.stack,
      cx: clamp(x(lo + (d.bin + 0.5) * width)),
      cy: baseline - radius - d.stack * pitch,
    })),
  }
}

export interface StripInput {
  values: readonly unknown[]
  x: LinearScale
  /** y of the row's bottom edge, in px. */
  baseline: number
  /** Highest y the dots may reach, in px. Default: no limit. */
  top?: number
  radius: number
  /** Space between dots in px. Default 1. */
  gap?: number
}

export interface StripDot {
  index: number
  value: number
  /** 0 is the bottom level. */
  level: number
  cx: number
  cy: number
}

export interface StripLayout {
  dots: StripDot[]
  /** True when the levels had to squeeze under `top`; dots then overlap. */
  crowded: boolean
}

/**
 * One dot per value at its exact x, lifted to the lowest level where it doesn't overlap. When the
 * levels would rise above `top`, they squeeze together so the highest ends at `top`.
 */
export function stackStrip({ values, x, baseline, top, radius, gap = 1 }: StripInput): StripLayout {
  const clamp = clampTo(x)
  const items = values.flatMap((raw, index) => {
    const value = toNumber(raw)
    return Number.isFinite(value) ? [{ index, value, cx: clamp(x(value)) }] : []
  })
  items.sort((a, b) => a.cx - b.cx || a.index - b.index)
  const step = 2 * radius + gap
  const lastOnLevel: number[] = []
  const leveled = items.map((item) => {
    let level = lastOnLevel.findIndex((cx) => item.cx - cx >= step)
    if (level === -1) level = lastOnLevel.length
    lastOnLevel[level] = item.cx
    return { ...item, level }
  })
  const highest = lastOnLevel.length - 1
  const room = top === undefined ? Number.POSITIVE_INFINITY : baseline - top - 2 * radius
  const crowded = highest > 0 && highest * step > room
  const pitch = crowded ? Math.max(0, room / highest) : step
  return {
    crowded,
    dots: leveled.map((item) => ({ ...item, cy: baseline - radius - item.level * pitch })),
  }
}

/** Median of the real values; NaN when there are none. */
export function medianOf(values: readonly unknown[]): number {
  const sorted = values
    .map(toNumber)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  if (sorted.length === 0) return Number.NaN
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2
}
