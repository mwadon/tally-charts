import type { CSSProperties } from 'react'
import type { Tone } from '../../core/types'

/** Position of `value` between `min` and `max` as a percentage, clamped to 0–100. */
export function toPercent(value: number, min: number, max: number): number {
  if (![value, min, max].every(Number.isFinite) || max === min) return 0
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
}

export function cx(base: string, extra?: string): string {
  return extra ? `${base} ${extra}` : base
}

/** Points `--ch-swatch-color` at a tone, so CSS can paint fills and tinted text with it. */
export function toneVar(tone: Tone): CSSProperties {
  return { '--ch-swatch-color': `var(--ch-${tone})` } as CSSProperties
}
