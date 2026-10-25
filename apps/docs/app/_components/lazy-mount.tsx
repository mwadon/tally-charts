'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'

interface LazyMountProps {
  /** Height of the placeholder in px, or any CSS length (`'16rem'`), so the layout does not shift when the children mount. */
  minHeight: number | string
  /** Margin around the viewport at which the children mount. Default `'0px 0px 200px 0px'`: 200 px before they scroll in. */
  rootMargin?: string
  children: ReactNode
}

/**
 * Mounts `children` when the placeholder comes near the viewport. The server and the first
 * client render are the placeholder, so hydration matches; without `IntersectionObserver` the
 * children mount right after the first effect.
 */
export function LazyMount({
  minHeight,
  rootMargin = '0px 0px 200px 0px',
  children,
}: LazyMountProps) {
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setMounted(true)
      return
    }
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMounted(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [rootMargin])

  if (mounted) return children
  return <div ref={ref} data-lazy-placeholder="" style={{ minHeight }} />
}
