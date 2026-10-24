'use client'

import { usePathname } from 'next/navigation'
import { AVAILABLE_SLUGS, docHref, NAV_GROUPS } from '../_content/navigation'

/** Sidebar. Pages that don't exist yet are listed but disabled, not linked. */
export function SideNav() {
  const pathname = usePathname()
  return (
    <nav className="side-nav" aria-label="Documentation">
      {NAV_GROUPS.map((group) => (
        <section key={group.label} aria-labelledby={`nav-${group.label}`}>
          <h2 id={`nav-${group.label}`} className="side-nav-group">
            {group.label}
          </h2>
          <ul>
            {group.items.map((item) => (
              <li key={item.slug}>
                {AVAILABLE_SLUGS.has(item.slug) ? (
                  <a
                    href={docHref(item.slug)}
                    aria-current={pathname === docHref(item.slug) ? 'page' : undefined}
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className="nav-soon" aria-disabled="true">
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  )
}
