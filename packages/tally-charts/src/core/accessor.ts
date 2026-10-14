import type { Accessor, Id, PerItem } from './types'
import type { Warn } from './warn'

export type FieldGetter = (d: unknown, i: number) => unknown

export function resolveAccessor<D, V>(accessor: Accessor<D, V>): (d: D, i: number) => V {
  if (typeof accessor === 'function') return accessor
  // Bad data never throws: a null or undefined row reads as undefined.
  return (d) => (d == null ? undefined : d[accessor]) as unknown as V
}

export function resolvePerItem<D, V>(
  value: PerItem<D, V>,
): (d: D, i: number, all: readonly D[]) => V {
  if (typeof value === 'function') return value as (d: D, i: number, all: readonly D[]) => V
  return () => value as V
}

export function toFieldGetter<D>(
  accessor: Accessor<D, unknown> | undefined,
): FieldGetter | undefined {
  return accessor === undefined ? undefined : (resolveAccessor(accessor) as unknown as FieldGetter)
}

/**
 * Reads a stable id per row. On any missing or duplicate id it warns once and falls back to
 * index ids for every row, since a partial fallback could collide with real numeric ids.
 */
export function resolveIds<D>(
  data: readonly D[],
  accessor: Accessor<D, Id> | undefined,
  warn: Warn,
): Id[] {
  const byIndex = () => data.map((_, i) => i)
  if (accessor === undefined) return byIndex()
  const get = resolveAccessor(accessor)
  const seen = new Set<Id>()
  const ids: Id[] = []
  for (let i = 0; i < data.length; i++) {
    const id = get(data[i] as D, i)
    if (id === null || id === undefined || seen.has(id)) {
      warn(
        'duplicate-id',
        `Missing or duplicate id "${String(id)}" at index ${i}; using the index for all rows instead.`,
      )
      return byIndex()
    }
    seen.add(id)
    ids.push(id)
  }
  return ids
}
