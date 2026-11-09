import { cmsMetadata } from '@glokki-cms/react'
import type { Metadata } from 'next'
import type { DeliveryPage } from './content'

type Env = Record<string, string | undefined>

export const DEFAULT_SITE_URL = 'http://localhost:3100'

export const SITE_NAME = 'tally-charts'

/** The one sentence about the library, shared by the Open Graph image. */
export const SITE_TAGLINE = 'Opinionated React charts for narrative business dashboards.'

/** The route of `app/opengraph-image.tsx`, and what that file renders. */
export const OG_IMAGE_PATH = '/opengraph-image'
export const OG_IMAGE = {
  width: 1200,
  height: 630,
  alt: `${SITE_NAME}: ${SITE_TAGLINE}`,
} as const

/** `SITE_URL` without a trailing slash; the local `next start` address when unset. */
export function siteUrl(env: Env = process.env) {
  return (env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '')
}

/**
 * Metadata for a CMS page at `path` (`/` or `/docs/<slug>`). `cmsMetadata` derives the URL from
 * the page slug, which is not the route here, and sets Open Graph only when the page has `og`
 * data, so the title, canonical, Open Graph and Twitter fields are completed (a card or an og
 * type set on the page wins over the defaults). Outside `APP_ENV=production` the page is
 * `noindex`.
 */
export function pageMetadata(page: DeliveryPage, path: string, env: Env = process.env): Metadata {
  const base = siteUrl(env)
  const metadata = cmsMetadata(page, { baseUrl: base, env: env.APP_ENV })
  const title = page.seo.metaTitle || `${page.title} · ${SITE_NAME}`
  const description = page.seo.metaDescription
  const canonical = page.seo.canonicalUrl || (path === '/' ? base : `${base}${path}`)
  const ogTitle = page.seo.og?.title || title
  const ogDescription = page.seo.og?.description || description
  // Next adds the image of app/opengraph-image.tsx only to the route next to that file (`/`); a
  // page with an `openGraph` of its own has to name it, unless the CMS page brings an image.
  const ogImages = metadata.openGraph?.images ?? [
    { ...OG_IMAGE, url: `${base}${OG_IMAGE_PATH}`, type: 'image/png' },
  ]

  return {
    ...metadata,
    title,
    alternates: { ...metadata.alternates, canonical },
    openGraph: {
      type: 'website',
      ...metadata.openGraph,
      siteName: SITE_NAME,
      title: ogTitle,
      description: ogDescription,
      url: canonical,
      images: ogImages,
    } as Metadata['openGraph'],
    twitter: {
      title: ogTitle,
      description: ogDescription,
      images: ogImages,
      ...metadata.twitter,
      card: page.seo.twitter?.card ?? 'summary_large_image',
    } as Metadata['twitter'],
  }
}
