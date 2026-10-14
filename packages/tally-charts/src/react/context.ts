import { createContext, useContext } from 'react'
import type { FormatOptions, FormatSpec, Formatter } from '../core/format'
import type { ResolvedScale } from '../core/scale'
import type { Id } from '../core/types'
import type { Warn } from '../core/warn'
import type { ActiveSource, ChartPoint } from './types'

export interface Margin {
  top: number
  right: number
  bottom: number
  left: number
}

export interface ChartContextValue {
  chartId: string
  width: number
  height: number
  innerWidth: number
  innerHeight: number
  margin: Margin
  data: readonly unknown[]
  x: ResolvedScale
  y: ResolvedScale
  format: (spec?: FormatSpec, options?: Pick<FormatOptions, 'signed'>) => Formatter
  warn: Warn
  dimInactive: boolean
  activeId: Id | null
  activePoint: ChartPoint | null
  points: ChartPoint[]
  setActive: (id: Id | null, source: ActiveSource) => void
  registerPoints: (key: string, points: ChartPoint[]) => void
  unregisterPoints: (key: string) => void
  /** HTML layer positioned at the plot origin; null until mounted. */
  overlay: HTMLDivElement | null
}

export const ChartContext = createContext<ChartContextValue | null>(null)

export function useChart(component = 'useChart'): ChartContextValue {
  const ctx = useContext(ChartContext)
  if (!ctx) throw new Error(`[tally-charts] <${component}> must be rendered inside <Chart>.`)
  return ctx
}
