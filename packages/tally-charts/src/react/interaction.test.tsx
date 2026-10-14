import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Id } from '../core/types'
import { navigate, samePoints, uniquePoints, useInteraction } from './interaction'
import type { ChartPoint } from './types'

const pts = (ids: Id[]): ChartPoint[] =>
  ids.map((id, index) => ({
    id,
    index,
    datum: null,
    x: index * 10,
    y: 0,
    label: `P${id}`,
    segments: [],
  }))

describe('navigate', () => {
  const points = pts(['a', 'b', 'c'])

  it('starts at the first point going forward and the last going back', () => {
    expect(navigate(points, null, 'ArrowRight')).toBe('a')
    expect(navigate(points, null, 'ArrowDown')).toBe('a')
    expect(navigate(points, null, 'ArrowLeft')).toBe('c')
    expect(navigate(points, null, 'ArrowUp')).toBe('c')
  })

  it('moves in data order and clamps at the ends', () => {
    expect(navigate(points, 'a', 'ArrowRight')).toBe('b')
    expect(navigate(points, 'c', 'ArrowRight')).toBe('c')
    expect(navigate(points, 'b', 'ArrowLeft')).toBe('a')
    expect(navigate(points, 'a', 'ArrowLeft')).toBe('a')
  })

  it('jumps with Home and End', () => {
    expect(navigate(points, 'b', 'Home')).toBe('a')
    expect(navigate(points, 'b', 'End')).toBe('c')
  })

  it('clears on Escape only when something is active', () => {
    expect(navigate(points, 'b', 'Escape')).toBeNull()
    expect(navigate(points, null, 'Escape')).toBeUndefined()
  })

  it('ignores other keys and empty charts', () => {
    expect(navigate(points, 'a', 'x')).toBeUndefined()
    expect(navigate([], null, 'ArrowRight')).toBeUndefined()
  })
})

describe('useInteraction', () => {
  it('tracks the active point when uncontrolled', () => {
    const onActiveChange = vi.fn()
    const { result } = renderHook(() => useInteraction({ onActiveChange }))
    act(() => result.current.registerPoints('m', pts(['a', 'b'])))
    act(() => result.current.setActive('b', 'pointer'))
    expect(result.current.activeId).toBe('b')
    expect(result.current.activePoint?.label).toBe('Pb')
    expect(result.current.source).toBe('pointer')
    expect(onActiveChange).toHaveBeenCalledWith('b', expect.objectContaining({ id: 'b' }))
  })

  it('only reports changes when controlled', () => {
    const onActiveChange = vi.fn()
    const { result } = renderHook(() => useInteraction({ activeId: null, onActiveChange }))
    act(() => result.current.registerPoints('m', pts(['a'])))
    act(() => result.current.setActive('a', 'keyboard'))
    expect(result.current.activeId).toBeNull()
    expect(onActiveChange).toHaveBeenCalledWith('a', expect.objectContaining({ id: 'a' }))
  })

  it('follows the controlled id', () => {
    const { result, rerender } = renderHook(
      (props: { id: Id | null }) => useInteraction({ activeId: props.id }),
      { initialProps: { id: null } as { id: Id | null } },
    )
    act(() => result.current.registerPoints('m', pts(['a', 'b'])))
    rerender({ id: 'b' })
    expect(result.current.activePoint?.id).toBe('b')
  })

  it('does not re-report the same id', () => {
    const onActiveChange = vi.fn()
    const { result } = renderHook(() => useInteraction({ onActiveChange }))
    act(() => result.current.registerPoints('m', pts(['a'])))
    act(() => result.current.setActive('a', 'pointer'))
    act(() => result.current.setActive('a', 'pointer'))
    expect(onActiveChange).toHaveBeenCalledTimes(1)
  })

  it('keeps registry state when identical points are re-registered', () => {
    const { result } = renderHook(() => useInteraction({}))
    act(() => result.current.registerPoints('m', pts(['a'])))
    const before = result.current.points
    act(() => result.current.registerPoints('m', pts(['a'])))
    expect(result.current.points).toBe(before)
  })

  it('concatenates marks in registration order and unregisters them', () => {
    const { result } = renderHook(() => useInteraction({}))
    act(() => {
      result.current.registerPoints('first', pts(['a']))
      result.current.registerPoints('second', pts(['b']))
    })
    expect(result.current.points.map((p) => p.id)).toEqual(['a', 'b'])
    act(() => result.current.unregisterPoints('first'))
    expect(result.current.points.map((p) => p.id)).toEqual(['b'])
  })

  it('drops the active point when its data disappears', () => {
    const { result } = renderHook(() => useInteraction({}))
    act(() => result.current.registerPoints('m', pts(['a', 'b', 'c'])))
    act(() => result.current.setActive('c', 'keyboard'))
    act(() => result.current.registerPoints('m', pts(['a', 'b'])))
    expect(result.current.activeId).toBe('c')
    expect(result.current.activePoint).toBeNull()
  })
})

describe('uniquePoints', () => {
  it('keeps the first point per id, in order', () => {
    const points = [...pts(['a', 'b']), ...pts(['a', 'c'])]
    expect(uniquePoints(points).map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('samePoints', () => {
  it('treats points with changed tooltip segments as different', () => {
    const a = pts(['a'])
    const b = pts(['a']).map((p) => ({ ...p, segments: [{ value: 'new' }] }))
    expect(samePoints(a, b)).toBe(false)
    expect(
      samePoints(
        b,
        pts(['a']).map((p) => ({ ...p, segments: [{ value: 'new' }] })),
      ),
    ).toBe(true)
  })

  it('treats points with a changed hit centre as different', () => {
    const a = pts(['a'])
    expect(samePoints(a, [{ ...(a[0] as ChartPoint), hitX: 1 }])).toBe(false)
    expect(samePoints(a, [{ ...(a[0] as ChartPoint), hitY: 1 }])).toBe(false)
  })

  it('treats points with a changed index as different', () => {
    const a = pts(['a'])
    expect(samePoints(a, [{ ...(a[0] as ChartPoint), index: 3 }])).toBe(false)
  })
})

describe('useInteraction ordering', () => {
  it('reports one change when the same id is set twice in one event', () => {
    const onActiveChange = vi.fn()
    const { result } = renderHook(() => useInteraction({ onActiveChange }))
    act(() => result.current.registerPoints('m', pts(['a', 'b'])))
    act(() => {
      result.current.setActive('a', 'pointer')
      result.current.setActive('a', 'pointer')
    })
    expect(onActiveChange).toHaveBeenCalledTimes(1)
  })

  it('de-duplicates points across marks', () => {
    const { result } = renderHook(() => useInteraction({}))
    act(() => {
      result.current.registerPoints('m1', pts(['a', 'b']))
      result.current.registerPoints('m2', pts(['a', 'b']))
    })
    expect(result.current.points.map((p) => p.id)).toEqual(['a', 'b'])
  })
})

describe('navigate with groups', () => {
  const at = (
    id: string,
    x: number,
    y: number,
    key: string,
    axis: 'vertical' | 'horizontal',
  ): ChartPoint => ({
    id,
    index: 0,
    datum: null,
    x,
    y,
    label: id,
    segments: [],
    group: { key, axis },
  })
  // Two stacks: A at x 0 (y 90, 80, 70), B at x 10 (y 90, 80).
  const stacks = [
    at('a0', 0, 90, 'A', 'vertical'),
    at('a1', 0, 80, 'A', 'vertical'),
    at('a2', 0, 70, 'A', 'vertical'),
    at('b0', 10, 90, 'B', 'vertical'),
    at('b1', 10, 80, 'B', 'vertical'),
  ]
  // Two rows: R at y 50 (x 0, 10, 20), S at y 100 (x 5, 18).
  const rows = [
    at('r0', 0, 50, 'R', 'horizontal'),
    at('r1', 10, 50, 'R', 'horizontal'),
    at('r2', 20, 50, 'R', 'horizontal'),
    at('s0', 5, 100, 'S', 'horizontal'),
    at('s1', 18, 100, 'S', 'horizontal'),
  ]

  it('moves within a vertical group and across to the nearest point', () => {
    expect(navigate(stacks, 'a0', 'ArrowUp')).toBe('a1')
    expect(navigate(stacks, 'a1', 'ArrowDown')).toBe('a0')
    expect(navigate(stacks, 'a2', 'ArrowUp')).toBe('a2')
    expect(navigate(stacks, 'a2', 'ArrowRight')).toBe('b1')
    expect(navigate(stacks, 'b0', 'ArrowLeft')).toBe('a0')
    expect(navigate(stacks, 'b1', 'ArrowRight')).toBe('b1')
  })

  it('moves along a horizontal group and between groups by x', () => {
    expect(navigate(rows, 'r1', 'ArrowRight')).toBe('r2')
    expect(navigate(rows, 'r0', 'ArrowLeft')).toBe('r0')
    expect(navigate(rows, 'r2', 'ArrowDown')).toBe('s1')
    expect(navigate(rows, 's0', 'ArrowUp')).toBe('r0')
    expect(navigate(rows, 's0', 'ArrowDown')).toBe('s0')
  })

  it('keeps Home, End and the first step unchanged', () => {
    expect(navigate(stacks, null, 'ArrowRight')).toBe('a0')
    expect(navigate(stacks, 'a1', 'Home')).toBe('a0')
    expect(navigate(stacks, 'a1', 'End')).toBe('b1')
  })

  it('treats a changed group as a different point', () => {
    const a = stacks.slice(0, 1)
    const moved = [{ ...(a[0] as ChartPoint), group: { key: 'B', axis: 'vertical' as const } }]
    expect(samePoints(a, moved)).toBe(false)
  })
})
