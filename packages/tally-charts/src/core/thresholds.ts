import { toNumber } from './number'
import type { SeqLevel, Tone } from './types'

/** Which edge of a bin holds a value equal to a break: 'lower' (default) or 'upper'. */
export type ThresholdInclusive = 'lower' | 'upper'

export interface ThresholdOptions {
  /**
   * 'lower' (default): a value on a break falls in the bin above it. 'upper': in the bin below,
   * as Core Web Vitals tiers count (an LCP of 2.5 s is Good).
   */
  inclusive?: ThresholdInclusive
}

export interface ThresholdBin {
  label: string
  tone: Tone
  /** Lower bound; -Infinity for the first bin. A bin is `[min, max)`, or `(min, max]` with `inclusive: 'upper'`. */
  min: number
  /** Upper bound; Infinity for the last bin. */
  max: number
}

export interface ThresholdLegendItem {
  label: string
  tone: Tone
  count: number
}

export interface Thresholds {
  bins: readonly ThresholdBin[]
  /**
   * The edge that holds a value on a break; `thresholds()` always sets it, and missing means
   * 'lower'. With `bins`, plain data a Server Component can pass.
   */
  inclusive?: ThresholdInclusive
  /** Bin index for a value, or -1 when it is missing or not a number. */
  indexOf(value: unknown): number
  toneOf(value: unknown): Tone | undefined
  /** Legend entries with counts, ready for `<Legend shape="dot" items={…} />`. */
  legend(values: readonly unknown[]): readonly ThresholdLegendItem[]
}

/** Internal: the index of the bin holding a finite `v`, given the bins' breaks. */
export function binIndex(
  v: number,
  breaks: readonly number[],
  inclusive: ThresholdInclusive = 'lower',
): number {
  const i = breaks.findIndex((b) => (inclusive === 'upper' ? v <= b : v < b))
  return i === -1 ? breaks.length : i
}

/**
 * Threshold categories. By default bins are `[min, max)`: values below `breaks[0]` are bin 0 and
 * values at or above the last break are the last bin. With `inclusive: 'upper'` bins are
 * `(min, max]`: bin 0 runs up to and including `breaks[0]`, the last bin is above the last break.
 * A malformed spec is a programmer error and throws.
 */
export function thresholds(
  breaks: readonly number[],
  tones: readonly Tone[],
  labels: readonly string[],
  options: ThresholdOptions = {},
): Thresholds {
  const inclusive = options.inclusive ?? 'lower'
  if (tones.length !== breaks.length + 1 || labels.length !== tones.length) {
    throw new Error('[tally-charts] thresholds() needs one more tone and label than breaks.')
  }
  breaks.forEach((b, i) => {
    const prev = breaks[i - 1]
    if (!Number.isFinite(b) || (prev !== undefined && !(b > prev))) {
      throw new Error('[tally-charts] thresholds() needs finite, strictly ascending breaks.')
    }
  })
  const bins: ThresholdBin[] = tones.map((tone, i) => ({
    label: labels[i] ?? '',
    tone,
    min: i === 0 ? Number.NEGATIVE_INFINITY : (breaks[i - 1] as number),
    max: i === breaks.length ? Number.POSITIVE_INFINITY : (breaks[i] as number),
  }))
  const indexOf = (value: unknown): number => {
    const v = toNumber(value)
    return Number.isFinite(v) ? binIndex(v, breaks, inclusive) : -1
  }
  return {
    bins,
    inclusive,
    indexOf,
    toneOf: (value) => bins[indexOf(value)]?.tone,
    legend: (values) => {
      const counts = bins.map(() => 0)
      for (const value of values) {
        const i = indexOf(value)
        if (i >= 0) counts[i] = (counts[i] ?? 0) + 1
      }
      return bins.map((bin, i) => ({ label: bin.label, tone: bin.tone, count: counts[i] ?? 0 }))
    },
  }
}

/** The most bin edges a heatmap uses: five bins, one per sequential level. */
export const MAX_BREAKS = 4

/** Internal: finite, ascending, unique edges, at most `MAX_BREAKS`, as Heatmap uses them. */
export function sequentialBreaks(breaks: readonly number[]): number[] {
  return [...new Set(breaks.filter(Number.isFinite))].sort((a, b) => a - b).slice(0, MAX_BREAKS)
}

/** Internal: bins spread over the five levels with the ends pinned; four bins use 1, 2, 4 and 5. */
export function binLevels(bins: number): SeqLevel[] {
  if (bins <= 1) return [3]
  return Array.from({ length: bins }, (_, i) => Math.round(1 + (i * 4) / (bins - 1)) as SeqLevel)
}

/** Internal: the level of a number among cleaned `edges` and their `levels`; 0 if not finite. */
export function levelFor(
  v: number,
  edges: readonly number[],
  levels: readonly SeqLevel[],
): SeqLevel | 0 {
  if (!Number.isFinite(v)) return 0
  const bin = edges.findIndex((b) => v < b)
  return levels[bin === -1 ? edges.length : bin] ?? 0
}

/**
 * The sequential level (1–5) a `Heatmap` with these `breaks` paints `value` with, or 0 for a
 * missing or non-numeric value. Use it to keep a standalone `Legend` in step with custom breaks.
 * Breaks are cleaned the way Heatmap cleans them: sorted, deduplicated, at most four.
 */
export function heatmapLevel(value: unknown, breaks: readonly number[]): SeqLevel | 0 {
  const edges = sequentialBreaks(breaks)
  return levelFor(toNumber(value), edges, binLevels(edges.length + 1))
}
