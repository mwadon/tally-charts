import type { ChartProps } from '../Chart'

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
