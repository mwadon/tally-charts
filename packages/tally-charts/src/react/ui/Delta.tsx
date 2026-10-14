import type { FormatSpec } from '../../core/format'
import type { Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar } from './util'

export type DeltaDirection = 'up' | 'down' | 'flat'

export interface DeltaProps {
  /** The change, e.g. -1.2 for "▼ 1.2 pts". */
  value: number
  /** Default 'number'. */
  format?: FormatSpec
  /** Which direction is good news; picks the tone when `tone` isn't set. Default 'up'. */
  good?: 'up' | 'down'
  tone?: Tone
  /** Show the sign on the number. Default false: the arrow carries the direction. */
  signed?: boolean
  className?: string
}

const ARROWS: Record<DeltaDirection, string> = { up: '▲', down: '▼', flat: '–' }
const WORDS: Record<DeltaDirection, string> = { up: 'Up', down: 'Down', flat: 'No change' }

/** A change pill: ▲/▼ plus the size of the change, toned by whether it's good news. */
export function Delta({ value, format, good = 'up', tone, signed = false, className }: DeltaProps) {
  const { create } = useFormat()
  if (!Number.isFinite(value)) return null
  const direction: DeltaDirection = value === 0 ? 'flat' : value > 0 ? 'up' : 'down'
  const resolved: Tone =
    tone ?? (direction === 'flat' ? 'neutral' : direction === good ? 'gain' : 'loss')
  const text = signed
    ? create(format, { signed: true })(value)
    : create(format, { signed: false })(Math.abs(value))
  return (
    <span
      className={cx('ch-delta', className)}
      data-ch-part="delta"
      data-ch-tone={resolved}
      data-ch-direction={direction}
      style={toneVar(resolved)}
    >
      <span aria-hidden="true" className="ch-delta-arrow ch-tone-text">
        {ARROWS[direction]}
      </span>
      <span className="ch-sr-only">{WORDS[direction]} </span>
      <span className="ch-delta-value">{text}</span>
    </span>
  )
}
