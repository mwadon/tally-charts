import { createClient } from '@glokki-cms/sdk'
import { z } from 'zod'
import { deliveryPageSchema } from './fixtures'
import {
  loadNavigationConfig,
  type NavigationConfig,
  slugPattern,
  withAvailability,
} from './navigation-config'
import type { ContentSource, DeliveryPage, DeliveryPageListItem } from './types'

export const CMS_TAG = 'cms'
const PAGE_SIZE = 100

// glokki stores and delivers a slug with a leading `/` (`/home`); the site and the fixtures use it
// without (`home`). A slug that arrives without one is left alone.
const bare = <T>(slug: T): T => (typeof slug === 'string' ? (slug.replace(/^\//, '') as T) : slug)

interface GlokkiOptions {
  baseUrl: string
  tenant: string
  apiKey: string
  /** Read drafts, and never cache: no `cms` tag, `cache: 'no-store'`. Default `false`. */
  preview?: boolean
  /**
   * The preview token of the tenant (`CMS_PREVIEW_TOKEN`), used with `preview` only. The SDK asks
   * the delivery API for a draft (`?preview=true&token=…`) only when it has both; without the
   * token a preview read is uncached but returns the published page.
   */
  previewToken?: string | undefined
  /** Defaults to `content/navigation.json`. */
  navigationConfig?: () => Promise<NavigationConfig>
}

/**
 * Published pages from the glokki delivery API. Every fetch is tagged `cms` for `revalidateTag`;
 * with `preview` it is `no-store` instead, and with a `previewToken` too `getPage` reads the
 * latest draft.
 */
export function createGlokkiSource({
  baseUrl,
  tenant,
  apiKey,
  preview = false,
  previewToken,
  navigationConfig = () => loadNavigationConfig(),
}: GlokkiOptions): ContentSource {
  const client = createClient({
    baseUrl,
    apiKey,
    tenantSlug: tenant,
    ...(preview
      ? {
          preview: true,
          ...(previewToken ? { previewToken } : {}),
          fetchInit: { cache: 'no-store' },
        }
      : { fetchInit: { next: { tags: [CMS_TAG] } } }),
  })

  // A slug that `getPage` refuses would be a 404 behind a sitemap entry or a static param, so
  // such a page is not listed. The offset counts what the API sent, not what was kept.
  async function listPages() {
    const items: DeliveryPageListItem[] = []
    let received = 0
    for (;;) {
      const { data, meta } = await client.pages.list({ limit: PAGE_SIZE, offset: received })
      received += data.length
      for (const item of data) {
        const slug = bare(item.slug)
        if (typeof slug === 'string' && slugPattern.test(slug)) items.push({ ...item, slug })
      }
      if (data.length === 0 || received >= meta.total) return items
    }
  }

  return {
    kind: 'cms',
    async getPage(slug) {
      // The SDK pastes the slug into the URL, and route params arrive decoded (`..%2F` is `../`):
      // anything but a plain slug could reach other endpoints with the API key.
      if (!slugPattern.test(slug)) return null
      const page = await client.pages.getBySlug(slug)
      if (!page) return null
      const parsed = deliveryPageSchema.safeParse({ ...page, slug: bare(page.slug) })
      if (!parsed.success)
        throw new Error(`glokki page "${slug}": ${z.prettifyError(parsed.error)}`)
      return parsed.data as unknown as DeliveryPage
    },
    listPages,
    async getNavigation() {
      const [config, published] = await Promise.all([navigationConfig(), client.navigation.get()])
      const slugs = new Set(published.map((item) => bare(item.slug)))
      return withAvailability(config, (slug) => slugs.has(slug))
    },
  }
}
