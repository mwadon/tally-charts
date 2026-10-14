import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Id } from '../core/types'
import { navigate, useInteraction } from './interaction'
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
