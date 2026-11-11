import { SITE } from '../_content/navigation'
import { MenuButton } from './nav-state'
import { ThemeSwitch } from './theme-switch'

interface SiteHeaderProps {
  /** Docs pages: the menu button instead of the Docs link. */
  withMenu?: boolean
  /** The home page: links to its Charts and Dashboards sections (hidden on narrow screens). */
  home?: boolean
}

/** The mark next to the wordmark: three overlapping peaks in the loss, accent and gain tones. */
function Mark() {
  return (
    <svg className="mark" viewBox="0 0 32 22" aria-hidden="true" focusable="false">
      <path className="art-loss" fillOpacity="0.85" d="M0 22L9 7l9 15z" />
      <path className="art-accent" fillOpacity="0.9" d="M7 22L15 0l8 22z" />
      <path className="art-gain" fillOpacity="0.85" d="M16 22l7-11 9 11z" />
    </svg>
  )
}

/**
 * Mark and wordmark, links, the theme switch and, on docs pages, the menu button. The home page
 * lists its sections first and leaves GitHub and npm to its footer; the other pages have no
 * footer, so their header keeps the two links and the hatched rule.
 */
export function SiteHeader({ withMenu = false, home = false }: SiteHeaderProps) {
  return (
    <header className={home ? 'site-header site-header-home' : 'site-header'}>
      <div className="site-header-inner">
        <a className="wordmark" href="/">
          <Mark />
          tally-charts
        </a>
        <a className="version" href="/docs/stability">
          {SITE.version}
        </a>
        <nav className="header-links" aria-label="Site">
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
          {withMenu ? null : <a href="/docs/getting-started">Docs</a>}
          {home ? null : (
            <>
              <a className="header-external" href={SITE.github}>
                GitHub
              </a>
              <a className="header-external" href={SITE.npm}>
                npm
              </a>
            </>
          )}
        </nav>
        <ThemeSwitch />
        {withMenu ? <MenuButton /> : null}
      </div>
      {home ? null : <div className="hatch-rule" aria-hidden="true" />}
    </header>
  )
}
