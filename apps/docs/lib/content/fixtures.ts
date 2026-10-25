import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import {
  defaultContentDir,
  loadNavigationConfig,
  NAVIGATION_FILE,
  slugPattern,
  withAvailability,
} from './navigation-config'
import type { ComponentNode, ContentSource, DeliveryPage, DeliveryPageListItem } from './types'

const componentNodeSchema: z.ZodType<ComponentNode> = z.lazy(() =>
  z.looseObject({
    id: z.string(),
    type: z.string(),
    props: z.record(z.string(), z.unknown()),
    children: z.array(componentNodeSchema).optional(),
  }),
) as z.ZodType<ComponentNode>

/** The fields of `DeliveryPage` that the site relies on; any other field is passed through. */
export const deliveryPageSchema = z.looseObject({
  pageId: z.string(),
  versionId: z.string().nullable(),
  version: z.number(),
  title: z.string().min(1),
  slug: z.string().regex(slugPattern),
  componentTree: z.array(componentNodeSchema),
  seo: z.looseObject({}),
  codeInjection: z.looseObject({}),
  locale: z.string(),
  publishedAt: z.string().nullable(),
  layout: z.object({ key: z.string(), header: z.unknown(), footer: z.unknown() }),
})

// `dir` is only known at runtime (the `content/` folder of the app), hence turbopackIgnore on the
// fs calls: Next must not trace the whole project for them. Fixtures are for dev, tests and CI.
function isMissing(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

/** Pages from `<dir>/<slug>.json` in the `DeliveryPage` format; `navigation.json` is not a page. */
export function createFixtureSource({ dir = defaultContentDir() } = {}): ContentSource {
  async function readPage(file: string): Promise<DeliveryPage | null> {
    let text: string
    try {
      text = await readFile(path.join(/*turbopackIgnore: true*/ dir, file), 'utf8')
    } catch (error) {
      if (isMissing(error)) return null
      throw error
    }
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch (error) {
      throw new Error(`${file}: ${error instanceof Error ? error.message : String(error)}`)
    }
    const parsed = deliveryPageSchema.safeParse(json)
    if (!parsed.success) throw new Error(`${file}: ${z.prettifyError(parsed.error)}`)
    // The schema checks the fields the site uses; the rest of DeliveryPage is passed through.
    return parsed.data as unknown as DeliveryPage
  }

  async function slugs() {
    const files = await readdir(/*turbopackIgnore: true*/ dir)
    return files
      .filter((file) => file.endsWith('.json') && file !== NAVIGATION_FILE)
      .map((file) => file.slice(0, -'.json'.length))
      .sort()
  }

  return {
    kind: 'fixtures',
    async getPage(slug) {
      const file = `${slug}.json`
      if (!slugPattern.test(slug) || file === NAVIGATION_FILE) return null
      return readPage(file)
    },
    async listPages() {
      const pages = await Promise.all((await slugs()).map((slug) => readPage(`${slug}.json`)))
      return pages.flatMap((page): DeliveryPageListItem[] =>
        page
          ? [
              {
                pageId: page.pageId,
                // Fixtures are always published, so a missing version id is a fixture bug.
                versionId: page.versionId ?? page.pageId,
                version: page.version,
                title: page.title,
                slug: page.slug,
                locale: page.locale,
                publishedAt: page.publishedAt,
              },
            ]
          : [],
      )
    },
    async getNavigation() {
      const available = new Set(await slugs())
      return withAvailability(await loadNavigationConfig(dir), (slug) => available.has(slug))
    },
  }
}
