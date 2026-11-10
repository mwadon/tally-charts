import { SITE } from '../_content/navigation'
import { MenuButton } from './nav-state'
import { ThemeSwitch } from './theme-switch'

interface SiteHeaderProps {
  /** Docs pages: the menu button instead of the Docs link. */
  withMenu?: boolean
  /** The home page: links to its Charts and Dashboards sections (hidden on narrow screens). */
  home?: boolean
}

/** Wordmark (text, no image), links, the theme switch and, on docs pages, the menu button. */
export function SiteHeader({ withMenu = false, home = false }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="wordmark" href="/">
          tally-charts
        </a>
        <a className="version" href="/docs/stability">
          {SITE.version}
        </a>
        <nav className="header-links" aria-label="Site">
          {withMenu ? null : <a href="/docs/getting-started">Docs</a>}
          {home ? (
            <>
              <a className="header-anchor" href="#charts">
                Charts
              </a>
              <a className="header-anchor" href="#dashboards">
                Dashboards
              </a>
            </>
          ) : null}
          <a className="header-external" href={SITE.github}>
            GitHub
          </a>
          <a className="header-external" href={SITE.npm}>
            npm
          </a>
        </nav>
        <ThemeSwitch />
        {withMenu ? <MenuButton /> : null}
      </div>
      <div className="hatch-rule" aria-hidden="true" />
    </header>
  )
}
