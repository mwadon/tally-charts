import { createContext, useContext } from 'react'
import type { FormatOptions, FormatSpec, Formatter } from '../core/format'
import type { FieldScale, ResolvedScale } from '../core/scale'
import type { Id } from '../core/types'
import type { Warn } from '../core/warn'
import type { ActiveSource, ChartPoint } from './types'

export interface Margin {
  top: number
  right: number
  bottom: number
  left: number
}

/** Which value scale a mark draws on: `y`, or the second scale from `<Chart y2>`. */
export type ValueScale = 'y' | 'y2'

/** What `useChart()` gives a custom mark: the chart's size, scales, formatter and active point. */
export interface ChartContextValue {
  width: number
  height: number
  /** Plot width: `width` minus the left and right margins. */
  innerWidth: number
  /** Plot height: `height` minus the top and bottom margins. */
  innerHeight: number
  margin: Margin
  data: readonly unknown[]
  x: ResolvedScale
  y: ResolvedScale
  /** The second value scale from `<Chart y2>`; undefined when the chart has none it can use. */
  y2?: ResolvedScale
  /** A number formatter in the `ChartsProvider` locale. */
  format: (spec?: FormatSpec, options?: Pick<FormatOptions, 'signed'>) => Formatter
  dimInactive: boolean
  activeId: Id | null
  activePoint: ChartPoint | null
  /** Every point the chart's marks registered, in order. */
  points: readonly ChartPoint[]
  setActive: (id: Id | null, source: ActiveSource) => void
  /** Calls the chart's `onSelect` with this point; does nothing without `onSelect`. */
  select: (point: ChartPoint) => void
  /** True when the chart has an `onSelect` handler. */
  selectable: boolean
  /** HTML layer positioned at the plot origin; null until mounted. */
  overlay: HTMLDivElement | null
}

/** Internal: the context the library's own marks read. Not part of the public API. */
export interface InternalChartContext extends ChartContextValue {
  chartId: string
  x: FieldScale
  y: FieldScale
  y2?: FieldScale
  warn: Warn
  /** Default bar corner radius in px, from `--ch-radius`. */
  radius: number
  registerPoints: (key: string, points: readonly ChartPoint[]) => void
  unregisterPoints: (key: string) => void
}

export const ChartContext = /* @__PURE__ */ createContext<InternalChartContext | null>(null)

/** Internal: the full chart context; `component` names the caller in the error. */
export function useChartContext(component: string): InternalChartContext {
  const ctx = useContext(ChartContext)
  if (!ctx) throw new Error(`[tally-charts] <${component}> must be rendered inside <Chart>.`)
  return ctx
}

/** The surrounding chart's size, scales and interaction state, for custom marks. */
export function useChart(): ChartContextValue {
  return useChartContext('useChart')
}
