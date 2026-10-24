import type { ReactNode } from 'react'
import { NavPanel, NavProvider } from '../_components/nav-state'
import { SideNav } from '../_components/side-nav'
import { SiteHeader } from '../_components/site-header'

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <NavProvider>
      <SiteHeader withMenu />
      <div className="docs-shell">
        <NavPanel>
          <SideNav />
        </NavPanel>
        <main id="main" className="docs-main">
          {children}
        </main>
      </div>
    </NavProvider>
  )
}
