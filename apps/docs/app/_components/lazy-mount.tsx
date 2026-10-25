'use client'

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'

interface LazyMountProps {
  /** Height of the placeholder in px, or any CSS length (`'16rem'`), so the layout does not shift when the children mount. */
  minHeight: number | string
  /**
   * Height from 764 px viewport width up (a rule in `globals.css`), for content that is taller or shorter
   * in a wider layout than in a narrow one. Default: `minHeight` at every width.
   */
  wideMinHeight?: number | string
  /**
   * Margin around the viewport at which the children mount. Default `'200px 0px 200px 0px'`:
   * 200 px before they scroll in from below and, scrolling up after a jump, before they
   * scroll in from above, so a height that differs from the reserved one changes the page
   * out of sight, where scroll anchoring keeps the visible content in place.
   */
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
  wideMinHeight,
  rootMargin = '200px 0px 200px 0px',
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
  const style: CSSProperties & { '--lazy-min-height-wide'?: string } = { minHeight }
  if (wideMinHeight !== undefined) {
    style['--lazy-min-height-wide'] =
      typeof wideMinHeight === 'number' ? `${wideMinHeight}px` : wideMinHeight
  }
  return (
    <div
      ref={ref}
      data-lazy-placeholder=""
      data-lazy-wide={wideMinHeight === undefined ? undefined : ''}
      style={style}
    />
  )
}
