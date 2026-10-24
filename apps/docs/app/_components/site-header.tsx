import { SITE } from '../_content/navigation'
import { MenuButton } from './nav-state'

/** Wordmark (text, no image), links, a visual theme switch and, on docs pages, the menu button. */
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
          <a href={SITE.github}>GitHub</a>
          <a href={SITE.npm}>npm</a>
        </nav>
        {/* Visual only: the light/dark/system switch with persistence belongs to F11. */}
        <button
          type="button"
          className="icon-button theme-toggle"
          disabled
          aria-label="Theme: follows the system (the switch arrives with the CMS-backed site)"
        >
          <span aria-hidden="true">◐</span>
        </button>
        {withMenu ? <MenuButton /> : null}
      </div>
      <div className="hatch-rule" aria-hidden="true" />
    </header>
  )
}
