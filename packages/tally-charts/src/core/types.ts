export const TONES = ['accent', 'accent-soft', 'loss', 'warn', 'gain', 'neutral'] as const

export type Tone = (typeof TONES)[number]

export type Fill = 'solid' | 'hatch' | 'hatch-fade'

export type Id = string | number

/** A field name or a function reading a value from a datum. */
export type Accessor<D, V> = (keyof D & string) | ((d: D, i: number) => V)

/** A constant or a per-item function. */
export type PerItem<D, V> = V | ((d: D, i: number, all: readonly D[]) => V)

/** A step on the sequential scale, `--ch-seq-1` (lightest) to `--ch-seq-5` (darkest). */
export type SeqLevel = 1 | 2 | 3 | 4 | 5
