import { describe, expect, it, vi } from 'vitest'
import { resolveAccessor, resolveIds, resolvePerItem, toFieldGetter } from './accessor'

describe('resolveAccessor', () => {
  it('reads a key', () => {
    expect(resolveAccessor<{ a: number }, number>('a')({ a: 3 }, 0)).toBe(3)
  })

  it('calls a function with datum and index', () => {
    expect(resolveAccessor((d: { a: number }, i: number) => d.a + i)({ a: 3 }, 2)).toBe(5)
  })

  it('yields undefined for a null or undefined row instead of throwing', () => {
    const get = resolveAccessor<{ a: number }, number>('a')
    expect(get(null as unknown as { a: number }, 0)).toBeUndefined()
    expect(get(undefined as unknown as { a: number }, 0)).toBeUndefined()
  })
})

describe('resolvePerItem', () => {
  it('wraps a constant', () => {
    expect(resolvePerItem<unknown, string>('solid')(null, 0, [])).toBe('solid')
  })

  it('passes datum, index and all items to a function', () => {
    const get = resolvePerItem<number, string>((d, i, all) => `${d}-${i}-${all.length}`)
    expect(get(2, 1, [1, 2, 3])).toBe('2-1-3')
  })
})

describe('resolveIds', () => {
  it('defaults to the index', () => {
    expect(resolveIds(['a', 'b'], undefined, () => {})).toEqual([0, 1])
  })

  it('reads ids with an accessor', () => {
    expect(resolveIds([{ id: 'x' }, { id: 'y' }], 'id', () => {})).toEqual(['x', 'y'])
  })

  it('falls back to index ids for every row on duplicate or missing ids and warns once', () => {
    const warn = vi.fn()
    const rows: { id: string | undefined }[] = [{ id: 'a' }, { id: 'a' }, { id: undefined }]
    expect(resolveIds(rows, (d) => d.id as string, warn)).toEqual([0, 1, 2])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toBe('duplicate-id')
    expect(warn.mock.calls[0]?.[1]).toContain('index 1')
  })

  it('does not let a partial fallback collide with real numeric ids', () => {
    const warn = vi.fn()
    expect(resolveIds([{ id: 1 }, { id: 1 }], 'id', warn)).toEqual([0, 1])
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('does not throw on null rows', () => {
    const warn = vi.fn()
    expect(resolveIds([null, null] as unknown as { id: string }[], 'id', warn)).toEqual([0, 1])
  })
})

describe('toFieldGetter', () => {
  it('returns undefined for a missing accessor', () => {
    expect(toFieldGetter(undefined)).toBeUndefined()
  })

  it('returns an untyped getter', () => {
    expect(toFieldGetter<{ v: number }>('v')?.({ v: 7 }, 0)).toBe(7)
  })

  it('yields undefined for a null row', () => {
    expect(toFieldGetter<{ v: number }>('v')?.(null, 0)).toBeUndefined()
  })
})
