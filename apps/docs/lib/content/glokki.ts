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

interface GlokkiOptions {
  baseUrl: string
  tenant: string
  apiKey: string
  /** Defaults to `content/navigation.json`. */
  navigationConfig?: () => Promise<NavigationConfig>
}

/** Published pages from the glökki delivery API. Every fetch is tagged `cms` for `revalidateTag`. */
export function createGlokkiSource({
  baseUrl,
  tenant,
  apiKey,
  navigationConfig = () => loadNavigationConfig(),
}: GlokkiOptions): ContentSource {
  const client = createClient({
    baseUrl,
    apiKey,
    tenantSlug: tenant,
    fetchInit: { next: { tags: [CMS_TAG] } },
  })

  async function listPages() {
    const items: DeliveryPageListItem[] = []
    for (;;) {
      const { data, meta } = await client.pages.list({ limit: PAGE_SIZE, offset: items.length })
      items.push(...data)
      if (data.length === 0 || items.length >= meta.total) return items
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
      const parsed = deliveryPageSchema.safeParse(page)
      if (!parsed.success)
        throw new Error(`glökki page "${slug}": ${z.prettifyError(parsed.error)}`)
      return parsed.data as unknown as DeliveryPage
    },
    listPages,
    async getNavigation() {
      const [config, published] = await Promise.all([navigationConfig(), client.navigation.get()])
      const slugs = new Set(published.map((item) => item.slug))
      return withAvailability(config, (slug) => slugs.has(slug))
    },
  }
}
