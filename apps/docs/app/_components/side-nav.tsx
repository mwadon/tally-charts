'use client'

import { usePathname } from 'next/navigation'
import type { NavigationGroup } from '../../lib/content'
import { docHref } from '../_content/doc-href'

/** Heading id for a group: `nav-` plus the label as a slug (no spaces, `aria-labelledby` takes id lists). */
function groupHeadingId(label: string) {
  return `nav-${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`
}

/** Sidebar. Pages that don't exist yet are listed but disabled, not linked. */
export function SideNav({ groups }: { groups: readonly NavigationGroup[] }) {
  const pathname = usePathname()
  return (
    <nav className="side-nav" aria-label="Documentation">
      {groups.map((group) => (
        <section key={group.label} aria-labelledby={groupHeadingId(group.label)}>
          <h2 id={groupHeadingId(group.label)} className="side-nav-group">
            {group.label}
          </h2>
          <ul>
            {group.items.map((item) => (
              <li key={item.slug}>
                {item.available ? (
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
