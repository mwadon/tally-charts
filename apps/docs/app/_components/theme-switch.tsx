'use client'

import { useEffect, useState } from 'react'
import { applyTheme, isForcedTheme, type ThemeChoice } from '../../lib/theme'

const SUN_RAYS =
  'M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8'

/**
 * Native select: the name, the state and the keyboard handling come from the platform. It is
 * drawn as an icon: the select lies transparent over the sun, so a click opens its list.
 */
export function ThemeSwitch() {
  // 'system' on the server; after mount, whatever the head script put on <html> (query or storage).
  const [choice, setChoice] = useState<ThemeChoice>('system')

  useEffect(() => {
    const attr = document.documentElement.getAttribute('data-ch-theme')
    setChoice(isForcedTheme(attr) ? attr : 'system')
  }, [])

  return (
    <span className="theme-switch">
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="3.75" />
        <path d={SUN_RAYS} />
      </svg>
      <select
        className="theme-select"
        aria-label="Theme"
        value={choice}
        onChange={(event) => {
          const next = event.target.value as ThemeChoice
          setChoice(next)
          applyTheme(next)
        }}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </span>
  )
}
