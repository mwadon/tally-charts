'use client'

import { useLayoutEffect } from 'react'
import { initialTheme } from '../../lib/theme'

/**
 * Applies the theme where the head script could not. When a page calls `notFound()`, Next sends
 * an empty document and renders the root layout in the browser, and a script that React inserts
 * there does not run: without this the 404 of an unknown docs slug would ignore `?theme=` and
 * the stored choice. A layout effect, so the theme select (a passive effect) reads the result.
 */
export function ThemeOnMount() {
  useLayoutEffect(() => {
    const root = document.documentElement
    if (root.hasAttribute('data-ch-theme')) return
    const theme = initialTheme()
    if (theme) root.setAttribute('data-ch-theme', theme)
  }, [])
  return null
}
