import type { ReactNode } from 'react'
import type { Id, Tone } from '../core/types'

export interface TooltipSegment {
  value: ReactNode
  label?: ReactNode
  tone?: Tone
}

/** Where a point sits in a stack (vertical) or a row (horizontal), for 2-D arrow keys. */
export interface PointGroup {
  key: string | number
  axis: 'vertical' | 'horizontal'
}

/** A focusable data point registered by a mark. Coordinates are in plot space. */
export interface ChartPoint {
  id: Id
  index: number
  datum: unknown
  x: number
  y: number
  /** Hit-test centre for NearestPointer; defaults to x/y. */
  hitX?: number
  /** Hit-test centre for NearestPointer; defaults to x/y. */
  hitY?: number
  /** Screen-reader text, e.g. "Sep 21, 34.0%". */
  label: string
  segments: TooltipSegment[]
  /** Stack or row membership; arrow keys move within and across groups when set. */
  group?: PointGroup
}

export type ActiveSource = 'pointer' | 'keyboard'
