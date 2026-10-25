import { SITE } from '../_content/navigation'
import { MenuButton } from './nav-state'
import { ThemeSwitch } from './theme-switch'

/** Wordmark (text, no image), links, the theme switch and, on docs pages, the menu button. */
export function SiteHeader({ withMenu = false }: { withMenu?: boolean }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="wordmark" href="/">
          tally-charts
        </a>
        <span className="version">{SITE.version}</span>
        <nav className="header-links" aria-label="Site">
          {withMenu ? null : <a href="/docs/line-chart">Docs</a>}
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
