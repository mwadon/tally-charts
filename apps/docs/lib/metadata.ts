import { cmsMetadata } from '@glokki-cms/react'
import type { Metadata } from 'next'
import type { DeliveryPage } from './content'

type Env = Record<string, string | undefined>

export const DEFAULT_SITE_URL = 'http://localhost:3100'

/** `SITE_URL` without a trailing slash; the local `next start` address when unset. */
export function siteUrl(env: Env = process.env) {
  return (env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '')
}

/**
 * Metadata for a CMS page at `path` (`/` or `/docs/<slug>`). `cmsMetadata` derives the URL from
 * the page slug, which is not the route here, and sets Open Graph only when the page has `og`
 * data, so the title, canonical and Open Graph fields are completed. Outside
 * `APP_ENV=production` the page is `noindex`.
 */
export function pageMetadata(page: DeliveryPage, path: string, env: Env = process.env): Metadata {
  const base = siteUrl(env)
  const metadata = cmsMetadata(page, { baseUrl: base, env: env.APP_ENV })
  const title = page.seo.metaTitle || `${page.title} · tally-charts`
  const description = page.seo.metaDescription
  const canonical = page.seo.canonicalUrl || (path === '/' ? base : `${base}${path}`)

  return {
    ...metadata,
    title,
    alternates: { ...metadata.alternates, canonical },
    openGraph: {
      ...metadata.openGraph,
      title: page.seo.og?.title || title,
      description: page.seo.og?.description || description,
      url: canonical,
    },
  }
}
