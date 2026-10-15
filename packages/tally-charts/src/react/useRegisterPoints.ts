import { useId } from 'react'
import { useChartContext } from './context'
import type { ChartPoint } from './types'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'

/**
 * Registers a mark's points with the surrounding chart, for hover, keyboard navigation and
 * tooltips. Pass the same array while the points don't change (memoize it), so the chart
 * doesn't re-render on every pass.
 */
export function useRegisterPoints(points: readonly ChartPoint[]): void {
  const key = useId()
  const { registerPoints, unregisterPoints } = useChartContext('useRegisterPoints')
  useIsoLayoutEffect(() => {
    registerPoints(key, points)
  }, [key, points, registerPoints])
  useIsoLayoutEffect(() => () => unregisterPoints(key), [key, unregisterPoints])
}
