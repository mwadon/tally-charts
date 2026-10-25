import type { ReactNode } from 'react'
import { getContentSource } from '../../lib/content'
import { NavPanel, NavProvider } from '../_components/nav-state'
import { SideNav } from '../_components/side-nav'
import { SiteHeader } from '../_components/site-header'

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const { groups } = await getContentSource().getNavigation()
  return (
    <NavProvider>
      <SiteHeader withMenu />
      <div className="docs-shell">
        <NavPanel>
          <SideNav groups={groups} />
        </NavPanel>
        <main id="main" className="docs-main">
          {children}
        </main>
      </div>
    </NavProvider>
  )
}
