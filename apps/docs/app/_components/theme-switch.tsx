'use client'

import { useEffect, useState } from 'react'
import { applyTheme, isForcedTheme, type ThemeChoice } from '../../lib/theme'

/** Native select: the name, the state and the keyboard handling come from the platform. */
export function ThemeSwitch() {
  // 'system' on the server; after mount, whatever the head script put on <html> (query or storage).
  const [choice, setChoice] = useState<ThemeChoice>('system')

  useEffect(() => {
    const attr = document.documentElement.getAttribute('data-ch-theme')
    setChoice(isForcedTheme(attr) ? attr : 'system')
  }, [])

  return (
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
  )
}
