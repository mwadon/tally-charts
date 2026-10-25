import type { MetadataRoute } from 'next'
import { getContentSource } from '../lib/content'
import { siteUrl } from '../lib/metadata'
import { docHref } from './_content/navigation'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const pages = await getContentSource().listPages()
  return pages.map((page) => ({
    url: page.slug === 'home' ? base : `${base}${docHref(page.slug)}`,
    ...(page.publishedAt ? { lastModified: page.publishedAt } : {}),
  }))
}
