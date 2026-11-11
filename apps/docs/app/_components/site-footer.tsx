import { SITE } from '../_content/navigation'

/** Footer of the home page: the license on the left, the two project links on the right. */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="footer-legal">tally-charts · MIT</p>
        <nav className="footer-links" aria-label="Project">
          <a href={SITE.github}>GitHub</a>
          <a href={SITE.npm}>npm</a>
        </nav>
      </div>
    </footer>
  )
}
