import { createClient } from '@glokki-cms/sdk'
import { loadNavigationConfig, type NavigationConfig, withAvailability } from './navigation-config'
import type { ContentSource, DeliveryPageListItem } from './types'

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
    getPage: (slug) => client.pages.getBySlug(slug),
    listPages,
    async getNavigation() {
      const [config, published] = await Promise.all([navigationConfig(), client.navigation.get()])
      const slugs = new Set(published.map((item) => item.slug))
      return withAvailability(config, (slug) => slugs.has(slug))
    },
  }
}
