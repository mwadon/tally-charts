import type { ReactNode } from 'react'
import type { Id, Tone } from '../core/types'

export interface TooltipSegment {
  value: ReactNode
  label?: ReactNode
  tone?: Tone
}

/** A focusable data point registered by a mark. Coordinates are in plot space. */
export interface ChartPoint {
  id: Id
  index: number
  datum: unknown
  x: number
  y: number
  /** Screen-reader text, e.g. "Sep 21, 34.0%". */
  label: string
  segments: TooltipSegment[]
}

export type ActiveSource = 'pointer' | 'keyboard'
