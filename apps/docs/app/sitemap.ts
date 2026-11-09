import type { MetadataRoute } from 'next'
import { getContentSource } from '../lib/content'
import { siteUrl } from '../lib/metadata'
import { docHref } from './_content/navigation'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const source = getContentSource()
  const pages = await source.listPages()
  // The `publishedAt` of a fixture is a constant in a JSON file, not the date the page changed,
  // so only the CMS gives a `lastModified`.
  const dated = source.kind === 'cms'
  return pages.map((page) => ({
    url: page.slug === 'home' ? base : `${base}${docHref(page.slug)}`,
    ...(dated && page.publishedAt ? { lastModified: page.publishedAt } : {}),
  }))
}
