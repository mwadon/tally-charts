export { toNumber } from '../../core/number'

import type { ReactNode } from 'react'
import type { Id } from '../../core/types'
import type { ChartProps } from '../Chart'
import type { TooltipProps } from '../overlays/Tooltip'
import type { ChartPoint } from '../types'

/**
 * A high-level chart's `tooltip`: `true` for the default pill, `false` for none, or a function
 * that renders the content for a point, whose `datum` is your row.
 */
export type ChartTooltip<D> = boolean | ((point: ChartPoint<D>) => ReactNode)

/** `<Chart>` props every high-level chart passes through unchanged. */
export type ChartPassThroughProps<D> = Pick<
  ChartProps<D>,
  | 'width'
  | 'initialWidth'
  | 'height'
  | 'aspectRatio'
  | 'margin'
  | 'title'
  | 'description'
  | 'activeId'
  | 'onActiveChange'
  | 'onSelect'
  | 'animate'
  | 'dimInactive'
  | 'empty'
  | 'className'
  | 'style'
  | 'chartId'
  | 'children'
>

/** Data-table header: the field name for a string accessor, otherwise the fallback. */
export function headerOf(accessor: unknown, fallback: string): string {
  return typeof accessor === 'string' ? accessor : fallback
}

/** Rows that high-level charts build around the user's datum. */
export interface WrappedRow<D> {
  datum: D
}

function unwrapPoint<D>(point: ChartPoint): ChartPoint<D> {
  return { ...point, datum: (point.datum as WrappedRow<D>).datum }
}

/**
 * `<Tooltip content>` for a chart's `tooltip` prop: undefined (the default pill) unless it is a
 * function. `unwrap` is false for charts whose rows already are the user's data.
 */
export function tooltipContent<D>(
  tooltip: ChartTooltip<D> | undefined,
  unwrap = true,
): TooltipProps['content'] {
  if (typeof tooltip !== 'function') return undefined
  return (point) => tooltip(unwrap ? unwrapPoint<D>(point) : (point as ChartPoint<D>))
}

/** Callbacks of a high-level chart report the user's datum, not the internal row. */
export function userCallbacks<D>(
  onSelect: ChartProps<D>['onSelect'],
  onActiveChange: ChartProps<D>['onActiveChange'],
): Pick<ChartProps<unknown>, 'onSelect' | 'onActiveChange'> {
  return {
    onSelect: onSelect
      ? (id: Id, point: ChartPoint) => onSelect(id, unwrapPoint<D>(point))
      : undefined,
    onActiveChange: onActiveChange
      ? (id: Id | null, point: ChartPoint | null) =>
          onActiveChange(id, point ? unwrapPoint<D>(point) : null)
      : undefined,
  }
}
