import type { ReactNode } from 'react'
import type { Id, Tone } from '../core/types'

export interface TooltipSegment {
  value: ReactNode
  label?: ReactNode
  tone?: Tone
}

/**
 * Where a point sits in a stack (vertical) or a row (horizontal), for 2-D arrow keys. Marks must
 * register grouped points in order: stacks left to right, dots bottom to top; rows top to bottom,
 * dots left to right.
 */
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
