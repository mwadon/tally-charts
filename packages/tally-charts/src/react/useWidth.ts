import { type RefObject, useState } from 'react'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'

/** Container width in whole px. Starts at `initialWidth` so server and first client render match. */
export function useWidth(
  ref: RefObject<HTMLElement | null>,
  initialWidth: number,
  enabled: boolean,
): number {
  const [width, setWidth] = useState(initialWidth)
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!enabled || !el) return
    const update = (next: number) => setWidth(Math.max(0, Math.round(next)))
    update(el.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) update(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, enabled])
  return width
}
