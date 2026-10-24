'use client'

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'

interface NavState {
  open: boolean
  toggle: () => void
}

const NavContext = createContext<NavState>({ open: false, toggle: () => {} })

export const NAV_PANEL_ID = 'docs-nav'

/** Shares the open state of the mobile navigation panel between the header button and the panel. */
export function NavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  // Escape closes the open panel from anywhere, not only while focus is inside it.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  return (
    <NavContext.Provider value={{ open, toggle: () => setOpen((o) => !o) }}>
      {children}
    </NavContext.Provider>
  )
}

export function MenuButton() {
  const { open, toggle } = useContext(NavContext)
  return (
    <button
      type="button"
      className="menu-button"
      aria-expanded={open}
      aria-controls={NAV_PANEL_ID}
      onClick={toggle}
    >
      Menu
    </button>
  )
}

/**
 * Below 900px the panel drops down under the header; from 900px it is the sticky sidebar.
 * Links are plain anchors, so following one reloads the page and the panel starts closed.
 */
export function NavPanel({ children }: { children: ReactNode }) {
  const { open } = useContext(NavContext)
  return (
    <div id={NAV_PANEL_ID} className="nav-panel" data-open={open}>
      {children}
    </div>
  )
}
