import { toNumber } from './number'
import type { Tone } from './types'

export interface ThresholdBin {
  label: string
  tone: Tone
  /** Inclusive lower bound; -Infinity for the first bin. */
  min: number
  /** Exclusive upper bound; Infinity for the last bin. */
  max: number
}

export interface ThresholdLegendItem {
  label: string
  tone: Tone
  count: number
}

export interface Thresholds {
  bins: readonly ThresholdBin[]
  /** Bin index for a value, or -1 when it is missing or not a number. */
  indexOf(value: unknown): number
  toneOf(value: unknown): Tone | undefined
  /** Legend entries with counts, ready for `<Legend shape="dot" items={…} />`. */
  legend(values: readonly unknown[]): readonly ThresholdLegendItem[]
}

/**
 * Threshold categories: values below `breaks[0]` are bin 0, values at or above the last break
 * are the last bin. A malformed spec is a programmer error and throws.
 */
export function thresholds(
  breaks: readonly number[],
  tones: readonly Tone[],
  labels: readonly string[],
): Thresholds {
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
    if (!Number.isFinite(v)) return -1
    const i = breaks.findIndex((b) => v < b)
    return i === -1 ? breaks.length : i
  }
  return {
    bins,
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
