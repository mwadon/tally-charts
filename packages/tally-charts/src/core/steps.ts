import { toNumber } from './number'

export type StepTone = 'gain' | 'loss' | 'neutral'

export interface StepTotal {
  index: number
  /** The step's value; NaN when it was missing or not a number. */
  value: number
  /** Running total before the step. */
  before: number
  /** Running total after the step; equals `before` for an invalid step. */
  after: number
  /** False for a missing or non-numeric value, which then changes nothing. */
  valid: boolean
  tone: StepTone
}

/** Cumulative totals for waterfall steps and bridge columns. Never throws on bad values. */
export function runningTotals(start: number, values: readonly unknown[]): StepTotal[] {
  let total = Number.isFinite(start) ? start : 0
  return values.map((raw, index) => {
    const value = toNumber(raw)
    const valid = Number.isFinite(value)
    const before = total
    if (valid) total += value
    const tone: StepTone = !valid || value === 0 ? 'neutral' : value > 0 ? 'gain' : 'loss'
    return { index, value, before, after: total, valid, tone }
  })
}
