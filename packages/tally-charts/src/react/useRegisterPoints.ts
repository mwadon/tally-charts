import { useId } from 'react'
import type { Interaction } from './interaction'
import type { ChartPoint } from './types'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'

/** Registers a mark's points for keyboard navigation and tooltips. */
export function useRegisterPoints(
  registry: Pick<Interaction, 'registerPoints' | 'unregisterPoints'>,
  points: ChartPoint[],
): void {
  const key = useId()
  const { registerPoints, unregisterPoints } = registry
  useIsoLayoutEffect(() => {
    registerPoints(key, points)
  }, [key, points, registerPoints])
  useIsoLayoutEffect(() => () => unregisterPoints(key), [key, unregisterPoints])
}
