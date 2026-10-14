import type { Id } from '../../core/types'
import type { ChartProps } from '../Chart'
import type { ChartPoint } from '../types'

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

/** Numbers from data: null and undefined become NaN instead of 0. */
export function toNumber(value: unknown): number {
  return value === null || value === undefined ? Number.NaN : Number(value)
}

/** Data-table header: the field name for a string accessor, otherwise the fallback. */
export function headerOf(accessor: unknown, fallback: string): string {
  return typeof accessor === 'string' ? accessor : fallback
}

/** Rows that high-level charts build around the user's datum. */
export interface WrappedRow<D> {
  datum: D
}

function unwrapPoint<D>(point: ChartPoint): ChartPoint {
  return { ...point, datum: (point.datum as WrappedRow<D>).datum }
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
