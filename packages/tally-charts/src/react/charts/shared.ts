export { toNumber } from '../../core/number'

import type { ReactNode } from 'react'
import type { Id } from '../../core/types'
import type { ChartProps } from '../Chart'
import type { DataTableSpec } from '../DataTable'
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
  | 'keyboardHint'
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

/** A high-level chart's `dataTable` as an object: the caption and readable column headers. */
export interface DataTableOptions {
  /** Caption of the hidden table. Default: the chart title. */
  caption?: string
  /**
   * New column headers, keyed by the default header, e.g. `{ Week: 'Week ending' }`. Columns
   * that are not listed keep their default header.
   */
  columns?: Partial<Record<string, string>>
}

/**
 * Data-table header for a string accessor: the field name in sentence case ("grossMargin" and
 * "gross_margin" read "Gross margin"). Function accessors get the fallback.
 */
export function headerOf(accessor: unknown, fallback: string): string {
  if (typeof accessor !== 'string') return fallback
  const words = accessor
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : fallback
}

/** A chart's table with the caption and the header names from a `dataTable` object. */
export function withTableOptions<R>(
  table: DataTableSpec<R> | undefined,
  options: boolean | DataTableOptions | undefined,
): DataTableSpec<R> | undefined {
  if (!table || typeof options !== 'object') return table
  const headers = options.columns ?? {}
  return {
    caption: options.caption ?? table.caption,
    columns: table.columns.map((column) => ({
      ...column,
      header: headers[column.header] ?? column.header,
    })),
  }
}

/** Rows that high-level charts build around the user's datum. */
export interface WrappedRow<D> {
  datum: D
}

/**
 * The point with the user's datum. A point from a custom child mark isn't a wrapped row, so its
 * own datum (even null) is passed on as it is.
 */
function unwrapPoint<D>(point: ChartPoint): ChartPoint<D> {
  return { ...point, datum: (point.datum as WrappedRow<D> | null)?.datum ?? (point.datum as D) }
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
