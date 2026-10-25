import { act, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { LazyMount } from './lazy-mount'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubObserver() {
  const state = {
    callback: undefined as IntersectionObserverCallback | undefined,
    options: undefined as IntersectionObserverInit | undefined,
    observe: vi.fn(),
    disconnect: vi.fn(),
  }
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        state.callback = callback
        state.options = options
      }
      observe = state.observe
      disconnect = state.disconnect
    },
  )
  const fire = (isIntersecting: boolean) =>
    act(() => state.callback?.([{ isIntersecting } as IntersectionObserverEntry], {} as never))
  return { state, fire }
}

test('before it intersects, renders a placeholder of the given height and no children', () => {
  const { state } = stubObserver()
  const { container } = render(
    <LazyMount minHeight={288}>
      <p>chart</p>
    </LazyMount>,
  )

  const placeholder = container.querySelector<HTMLElement>('[data-lazy-placeholder]')
  expect(placeholder?.style.minHeight).toBe('288px')
  expect(placeholder?.childNodes).toHaveLength(0)
  expect(screen.queryByText('chart')).toBeNull()
  expect(state.observe).toHaveBeenCalledWith(placeholder)
  expect(state.options).toEqual({ rootMargin: '0px 0px 200px 0px' })
})

test('takes a CSS length and a rootMargin', () => {
  const { state } = stubObserver()
  const { container } = render(
    <LazyMount minHeight="16rem" rootMargin="0px">
      <p>chart</p>
    </LazyMount>,
  )

  expect(container.querySelector<HTMLElement>('[data-lazy-placeholder]')?.style.minHeight).toBe(
    '16rem',
  )
  expect(state.options).toEqual({ rootMargin: '0px' })
})

test('an entry that does not intersect keeps the placeholder', async () => {
  const { fire, state } = stubObserver()
  const { container } = render(
    <LazyMount minHeight={100}>
      <p>chart</p>
    </LazyMount>,
  )

  await fire(false)

  expect(container.querySelector('[data-lazy-placeholder]')).not.toBeNull()
  expect(state.disconnect).not.toHaveBeenCalled()
})

test('mounts the children and disconnects once it intersects', async () => {
  const { fire, state } = stubObserver()
  const { container } = render(
    <LazyMount minHeight={100}>
      <p>chart</p>
    </LazyMount>,
  )

  await fire(true)

  expect(screen.getByText('chart')).toBeTruthy()
  expect(container.querySelector('[data-lazy-placeholder]')).toBeNull()
  expect(state.disconnect).toHaveBeenCalled()
})

test('disconnects on unmount', () => {
  const { state } = stubObserver()
  const { unmount } = render(
    <LazyMount minHeight={100}>
      <p>chart</p>
    </LazyMount>,
  )

  unmount()

  expect(state.disconnect).toHaveBeenCalled()
})

test('without IntersectionObserver the children mount at once', () => {
  vi.stubGlobal('IntersectionObserver', undefined)
  const { container } = render(
    <LazyMount minHeight={100}>
      <p>chart</p>
    </LazyMount>,
  )

  expect(screen.getByText('chart')).toBeTruthy()
  expect(container.querySelector('[data-lazy-placeholder]')).toBeNull()
})
