import { SITE } from '../_content/navigation'

const COLUMNS = [
  {
    label: 'Guides',
    links: [
      { label: 'Getting started', href: '/docs/getting-started' },
      { label: 'Theming', href: '/docs/theming' },
      { label: 'Accessibility', href: '/docs/accessibility' },
      { label: 'Composition', href: '/docs/composition' },
    ],
  },
  {
    label: 'Reference',
    links: [
      { label: 'Hooks and providers', href: '/docs/hooks-and-providers' },
      { label: 'Stability', href: '/docs/stability' },
      { label: 'Migration to 1.0', href: '/docs/migration-1-0' },
    ],
  },
  {
    label: 'Project',
    links: [
      { label: 'GitHub', href: SITE.github },
      { label: 'npm', href: SITE.npm },
    ],
  },
] as const

/** Footer of the home page: what the library is, three columns of links and the license. */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-columns">
          <div>
            <p className="footer-title">{SITE.name}</p>
            <p>Opinionated React charts for narrative business dashboards.</p>
          </div>
          {COLUMNS.map((column) => (
            <nav key={column.label} aria-label={column.label}>
              <p className="footer-title">{column.label}</p>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="footer-legal">tally-charts · MIT</p>
      </div>
    </footer>
  )
}
