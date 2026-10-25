import { type ApiCoverage, type CheckResult, type ContentIssue, checkPages } from './check'
import { createFixtureSource } from './fixtures'
import { createGlokkiSource } from './glokki'
import type { ContentSource, DeliveryPage } from './types'

type Env = Record<string, string | undefined>

export interface NamedSource {
  /** `fixtures` or `cms`, the prefix of the report lines. */
  name: string
  source: ContentSource
}

export interface SourceReport extends CheckResult {
  name: string
  pages: number
  coverage: ApiCoverage
}

/**
 * The fixtures in `contentDir` always, plus glökki when `CMS_BASE_URL` is set (then `CMS_TENANT`
 * and `CMS_API_KEY` are required, as in `getContentSource`, which is not used here: with the env
 * it returns the CMS only, and it is wrapped in React's `cache`).
 */
export function selectSources(env: Env, contentDir?: string): NamedSource[] {
  const sources: NamedSource[] = [
    { name: 'fixtures', source: createFixtureSource({ dir: contentDir }) },
  ]
  const baseUrl = env.CMS_BASE_URL
  if (!baseUrl) return sources

  const { CMS_TENANT: tenant, CMS_API_KEY: apiKey } = env
  if (!tenant || !apiKey) {
    const missing = [!tenant && 'CMS_TENANT', !apiKey && 'CMS_API_KEY'].filter(Boolean)
    throw new Error(`CMS_BASE_URL is set, but ${missing.join(' and ')} is missing`)
  }
  sources.push({ name: 'cms', source: createGlokkiSource({ baseUrl, tenant, apiKey }) })
  return sources
}

/** Every listed page of the source; a loader failure (bad JSON, bad schema, network) is an issue. */
async function loadPages(
  source: ContentSource,
): Promise<{ pages: DeliveryPage[]; error?: string }> {
  try {
    const items = await source.listPages()
    const pages = await Promise.all(items.map((item) => source.getPage(item.slug)))
    return { pages: pages.flatMap((page) => (page ? [page] : [])) }
  } catch (error) {
    return { pages: [], error: error instanceof Error ? error.message : String(error) }
  }
}

/** Checks each source on its own: the slugs a link may point at and the API coverage are per source. */
export async function checkSources(
  sources: readonly NamedSource[],
  { requireCoverage = false }: { requireCoverage?: boolean } = {},
): Promise<SourceReport[]> {
  return Promise.all(
    sources.map(async ({ name, source }) => {
      const { pages, error } = await loadPages(source)
      // Nothing is covered when the pages did not load; the load error is the one to fix.
      const result = checkPages(pages, { requireCoverage: requireCoverage && !error })
      const loadIssues: ContentIssue[] = error
        ? [{ slug: '', message: `cannot load pages: ${error}` }]
        : []
      return { name, pages: pages.length, ...result, errors: [...loadIssues, ...result.errors] }
    }),
  )
}
