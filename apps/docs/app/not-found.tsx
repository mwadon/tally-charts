import type { Metadata } from 'next'
import { SITE_NAME } from '../lib/metadata'
import { SiteHeader } from './_components/site-header'
import { ThemeOnMount } from './_components/theme-on-mount'

export const metadata: Metadata = { title: `Page not found · ${SITE_NAME}` }

/** Every 404 of the site: an unknown path and a docs slug without a page. */
export default function NotFound() {
  return (
    <>
      <ThemeOnMount />
      <SiteHeader />
      <main id="main" className="home status-page">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p className="lede">
          There is no page at this address. It may have moved, or the link has a typo.
        </p>
        <p className="actions">
          <a className="button button-primary" href="/">
            Home
          </a>
          <a className="button" href="/docs/getting-started">
            Getting started
          </a>
        </p>
      </main>
    </>
  )
}
