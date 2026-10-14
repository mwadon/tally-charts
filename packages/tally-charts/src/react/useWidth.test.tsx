import { act, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWidth } from './useWidth'

function Probe({ enabled = true }: { enabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const width = useWidth(ref, 640, enabled)
  return <div ref={ref}>width:{width}</div>
}

describe('useWidth', () => {
  const original = globalThis.ResizeObserver
  afterEach(() => {
    globalThis.ResizeObserver = original
  })

  it('measures on mount and follows resizes', () => {
    let callback: ResizeObserverCallback = () => {}
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        callback = cb
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 480.4,
    } as DOMRect)
    render(<Probe />)
    expect(screen.getByText('width:480')).toBeInTheDocument()
    act(() =>
      callback([{ contentRect: { width: 300 } } as ResizeObserverEntry], {} as ResizeObserver),
    )
    expect(screen.getByText('width:300')).toBeInTheDocument()
  })

  it('keeps the initial width when disabled', () => {
    render(<Probe enabled={false} />)
    expect(screen.getByText('width:640')).toBeInTheDocument()
  })
})
