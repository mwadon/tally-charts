// @vitest-environment node
import path from 'node:path'
import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { createGlokkiSource } from './glokki'
import { loadNavigationConfig, type NavigationConfig } from './navigation-config'
import {
  applySeed,
  formatPlan,
  planSeed,
  type RemoteDetail,
  type RemotePage,
  readFixtures,
  readRemote,
  type SeedAction,
  type SeedClient,
} from './seed'
import type { DeliveryPage } from './types'

const realDir = path.join(import.meta.dirname, '..', '..', 'content')

const WRITES = [
  'createPage',
  'addBlock',
  'updateBlockProps',
  'removeBlock',
  'updatePage',
  'updateSeo',
  'publishPage',
] as const

interface Stored {
  id: string
  slug: string
  title: string
  locale: string
  status: 'draft' | 'published'
  updatedAt: number
  nodes: { id: string; type: string; props: Record<string, unknown> }[]
  seo: Record<string, unknown>
}

/**
 * glokki in memory: it mints the ids of the nodes, adds a key from `defaultProps` to every block,
 * rejects a stale `expectedUpdatedAt`, and sets a published page back to `draft` on any content
 * write, as the real server does.
 */
class FakeCms implements SeedClient {
  pages = new Map<string, Stored>()
  calls: string[] = []
  private ids = 0

  private touch(page: Stored) {
    page.updatedAt += 1
    if (page.status === 'published') page.status = 'draft'
    return { updatedAt: String(page.updatedAt) }
  }

  private edit(pageId: string, expectedUpdatedAt: string, call: string) {
    this.calls.push(call)
    const page = this.pages.get(pageId)
    if (!page) throw new Error(`no page ${pageId}`)
    if (String(page.updatedAt) !== expectedUpdatedAt) throw new Error(`STALE_PAGE ${page.slug}`)
    return page
  }

  /** The pages as they are published, like the delivery navigation. */
  get navigation() {
    return [...this.pages.values()].filter((page) => page.status === 'published').map((p) => p.slug)
  }

  writes() {
    return this.calls.filter((call) => (WRITES as readonly string[]).includes(call))
  }

  seed(slug: string, page: Partial<Stored> = {}) {
    const id = `seeded-${++this.ids}`
    this.pages.set(id, {
      id,
      slug,
      title: slug,
      locale: 'en',
      status: 'published',
      updatedAt: 1,
      nodes: [],
      seo: {},
      ...page,
    })
  }

  async listPages(): Promise<RemotePage[]> {
    this.calls.push('listPages')
    return [...this.pages.values()].map(({ id, slug, title, locale, status }) => ({
      id,
      slug,
      title,
      locale,
      status,
    }))
  }

  async getPage(pageId: string): Promise<RemoteDetail> {
    this.calls.push('getPage')
    const page = this.pages.get(pageId)
    if (!page) throw new Error(`no page ${pageId}`)
    return structuredClone({
      ...page,
      updatedAt: String(page.updatedAt),
      componentTree: page.nodes,
    })
  }

  async getBlockDefaults() {
    this.calls.push('getBlockDefaults')
    return { fromDefaults: true }
  }

  async createPage({ title, slug, locale }: { title: string; slug: string; locale: string }) {
    this.calls.push('createPage')
    const id = `page-${++this.ids}`
    this.pages.set(id, {
      id,
      slug,
      title,
      locale,
      status: 'draft',
      updatedAt: 1,
      nodes: [],
      seo: {},
    })
    return { id, updatedAt: '1' }
  }

  async addBlock(args: { pageId: string; expectedUpdatedAt: string; type: string; props: object }) {
    const page = this.edit(args.pageId, args.expectedUpdatedAt, 'addBlock')
    page.nodes.push({
      id: `node-${++this.ids}`,
      type: args.type,
      props: { fromDefaults: true, ...structuredClone(args.props) },
    })
    return this.touch(page)
  }

  async updateBlockProps(args: {
    pageId: string
    expectedUpdatedAt: string
    nodeId: string
    propsPatch: object
  }) {
    const page = this.edit(args.pageId, args.expectedUpdatedAt, 'updateBlockProps')
    const node = page.nodes.find((n) => n.id === args.nodeId)
    if (!node) throw new Error(`no node ${args.nodeId}`)
    Object.assign(node.props, structuredClone(args.propsPatch))
    return this.touch(page)
  }

  async removeBlock(args: { pageId: string; expectedUpdatedAt: string; nodeId: string }) {
    const page = this.edit(args.pageId, args.expectedUpdatedAt, 'removeBlock')
    page.nodes = page.nodes.filter((n) => n.id !== args.nodeId)
    return this.touch(page)
  }

  async updatePage(args: { pageId: string; expectedUpdatedAt: string; title: string }) {
    const page = this.edit(args.pageId, args.expectedUpdatedAt, 'updatePage')
    page.title = args.title
    return this.touch(page)
  }

  async updateSeo(args: { pageId: string; expectedUpdatedAt: string; seo: object }) {
    const page = this.edit(args.pageId, args.expectedUpdatedAt, 'updateSeo')
    page.seo = structuredClone(args.seo) as Record<string, unknown>
    return this.touch(page)
  }

  async publishPage(pageId: string) {
    this.calls.push('publishPage')
    const page = this.pages.get(pageId)
    if (!page) throw new Error(`no page ${pageId}`)
    page.status = 'published'
  }
}

let fixtures: DeliveryPage[]
let navigation: NavigationConfig

beforeAll(async () => {
  fixtures = await readFixtures(realDir)
  navigation = await loadNavigationConfig(realDir)
})

async function run(
  cms: FakeCms,
  pages = fixtures,
  { dryRun = false, navigation: config = navigation } = {},
) {
  const plan = planSeed(pages, config, await readRemote(cms, pages))
  await applySeed(cms, plan, { dryRun })
  return plan
}

const stored = (cms: FakeCms, slug: string) =>
  defined([...cms.pages.values()].find((page) => page.slug === slug))

const kinds = (plan: readonly SeedAction[]) => plan.map((action) => action.kind)
const where = (plan: readonly SeedAction[], slug: string) =>
  plan.find((action) => action.slug === slug)

function firstNode(page: DeliveryPage) {
  return defined(page.componentTree[0])
}

function defined<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('expected a value')
  return value
}

/** A copy of the fixtures where the page `slug` has been changed by `change`. */
function changed(slug: string, change: (page: DeliveryPage) => void) {
  const pages = structuredClone(fixtures)
  const page = pages.find((p) => p.slug === slug)
  if (!page) throw new Error(`no fixture ${slug}`)
  change(page)
  return pages
}

describe('the first run', () => {
  test('creates and publishes every fixture, so the navigation has all their slugs', async () => {
    const cms = new FakeCms()
    const plan = await run(cms)

    expect(fixtures.length).toBeGreaterThan(0)
    expect(plan.filter((a) => a.kind === 'create')).toHaveLength(fixtures.length)
    expect(cms.navigation.sort()).toEqual(fixtures.map((f) => `/${f.slug}`).sort())
    expect(cms.navigation).toContain('/home')
  })

  test('writes the title, the seo and the blocks of a fixture, in order', async () => {
    const cms = new FakeCms()
    await run(cms)
    const page = stored(cms, '/getting-started')
    const fixture = fixtures.find((f) => f.slug === 'getting-started') as DeliveryPage

    expect(page.title).toBe(fixture.title)
    expect(page.seo).toMatchObject(fixture.seo)
    expect(page.nodes.map((n) => n.type)).toEqual(fixture.componentTree.map((n) => n.type))
    expect(page.nodes[0]?.props).toMatchObject(fixture.componentTree[0]?.props ?? {})
  })
})

describe('the second run', () => {
  test('makes no write and skips everything as unchanged, though the CMS minted ids and defaults', async () => {
    const cms = new FakeCms()
    await run(cms)
    cms.calls.length = 0

    const plan = await run(cms)

    expect(cms.writes()).toEqual([])
    expect(kinds(plan)).toEqual(plan.map(() => 'skip'))
    expect(plan.filter((a) => a.fixture).every((a) => a.reasons.join() === 'unchanged')).toBe(true)
    expect(formatPlan(plan)).toContain(`seed: 0 create, 0 update, ${plan.length} skip`)
  })
})

describe('--dry-run', () => {
  test('on an empty CMS lists a create for every page and writes nothing', async () => {
    const cms = new FakeCms()
    const plan = await run(cms, fixtures, { dryRun: true })
    const text = formatPlan(plan)

    expect(cms.writes()).toEqual([])
    expect(cms.pages.size).toBe(0)
    expect(text).toContain('create  /getting-started')
    expect(text).toContain('create  /home')
    expect(text).toContain(`seed: ${fixtures.length} create, 0 update,`)
  })

  test.each([
    [
      'a prop',
      'blocks',
      (p: DeliveryPage) => {
        firstNode(p).props.markdown = 'new'
      },
    ],
    [
      'the title',
      'title',
      (p: DeliveryPage) => {
        p.title = 'Another title'
      },
    ],
    [
      'the seo',
      'seo',
      (p: DeliveryPage) => {
        p.seo = { ...p.seo, metaTitle: 'Another' }
      },
    ],
  ])('after a change of %s updates only that page', async (_name, reason, change) => {
    const cms = new FakeCms()
    await run(cms)
    cms.calls.length = 0

    const plan = await run(cms, changed('theming', change), { dryRun: true })

    expect(cms.writes()).toEqual([])
    expect(plan.filter((a) => a.kind === 'update').map((a) => a.slug)).toEqual(['/theming'])
    expect(where(plan, '/theming')?.reasons).toEqual([reason])
    expect(formatPlan(plan)).toContain(`update  /theming (${reason})`)
    expect(formatPlan(plan)).toContain('skip    /home (unchanged)')
  })
})

describe('pages that are not fixtures', () => {
  // A slug of the navigation that has no fixture, whatever content/ holds.
  const withoutFixture = { label: 'Not a fixture', slug: 'not-a-fixture' }
  const extended = (): NavigationConfig => ({
    groups: [...navigation.groups, { label: 'Extra', items: [withoutFixture] }],
  })

  test('a page only in the CMS is skipped and never removed, a navigation slug without a fixture too', async () => {
    const cms = new FakeCms()
    cms.seed('/written-in-the-cms', { nodes: [{ id: 'x', type: 'prose', props: {} }] })
    expect(fixtures.some((f) => f.slug === withoutFixture.slug)).toBe(false)

    const plan = await run(cms, fixtures, { navigation: extended() })

    expect(where(plan, '/written-in-the-cms')).toMatchObject({
      kind: 'skip',
      reasons: ['not in fixtures'],
    })
    expect(where(plan, `/${withoutFixture.slug}`)).toMatchObject({
      kind: 'skip',
      reasons: ['no fixture'],
    })
    expect(formatPlan(plan)).toContain('skip    /written-in-the-cms (not in fixtures)')
    expect(formatPlan(plan)).toContain(`skip    /${withoutFixture.slug} (no fixture)`)
    expect([...cms.pages.values()].some((p) => p.slug === '/written-in-the-cms')).toBe(true)
    expect(cms.calls).not.toContain('removeBlock')
  })

  test('a navigation slug that is a CMS page without a fixture is listed once, as "no fixture"', async () => {
    const cms = new FakeCms()
    cms.seed('/not-a-fixture')

    const plan = await run(cms, fixtures, { dryRun: true, navigation: extended() })

    expect(plan.filter((a) => a.slug === '/not-a-fixture')).toHaveLength(1)
    expect(where(plan, '/not-a-fixture')?.reasons).toEqual(['no fixture'])
  })
})

describe('a changed tree', () => {
  test.each([
    ['the order of the blocks', (p: DeliveryPage) => void p.componentTree.reverse()],
    [
      'the type of a block',
      (p: DeliveryPage) => {
        const node = firstNode(p)
        node.type = node.type === 'prose' ? 'callout' : 'prose'
      },
    ],
    ['the number of the blocks', (p: DeliveryPage) => void p.componentTree.pop()],
  ])('after %s the tree is rebuilt and the next run is empty', async (_name, change) => {
    const cms = new FakeCms()
    await run(cms)
    cms.calls.length = 0
    const pages = changed('thresholds', change)

    const plan = await run(cms, pages)

    expect(where(plan, '/thresholds')).toMatchObject({ kind: 'update', reasons: ['blocks'] })
    expect(cms.calls).toContain('removeBlock')
    expect(cms.calls).toContain('addBlock')
    expect(stored(cms, '/thresholds').status).toBe('published')

    cms.calls.length = 0
    const next = await run(cms, pages)
    expect(cms.writes()).toEqual([])
    expect(kinds(next)).toEqual(next.map(() => 'skip'))
  })

  test('with the same block types only the props that differ are patched', async () => {
    const cms = new FakeCms()
    await run(cms)
    cms.calls.length = 0

    await run(
      cms,
      changed('thresholds', (p) => {
        firstNode(p).props.markdown = 'changed'
      }),
    )

    expect(cms.writes()).toEqual(['updateBlockProps', 'publishPage'])
  })
})

describe('what is gone from a fixture', () => {
  const heading = (p: DeliveryPage) =>
    defined(p.componentTree.find((n) => n.type === 'heading' && 'anchor' in n.props))

  test('a removed prop is removed from the CMS by rebuilding the tree, then the run is empty', async () => {
    const cms = new FakeCms()
    await run(cms)
    cms.calls.length = 0
    const pages = changed('theming', (p) => void delete heading(p).props.anchor)

    const plan = await run(cms, pages)

    expect(where(plan, '/theming')).toMatchObject({ kind: 'update', reasons: ['blocks'] })
    expect(cms.calls).toContain('removeBlock')
    const anchors = (nodes: { props: object }[]) => nodes.filter((n) => 'anchor' in n.props).length
    const theming = defined(pages.find((p) => p.slug === 'theming'))
    expect(anchors(stored(cms, '/theming').nodes)).toBe(anchors(theming.componentTree))
    expect(anchors(theming.componentTree)).toBeGreaterThan(0)

    cms.calls.length = 0
    expect(kinds(await run(cms, pages))).toEqual(plan.map(() => 'skip'))
    expect(cms.writes()).toEqual([])
  })

  test('a removed seo field is removed from the CMS, then the run is empty', async () => {
    const cms = new FakeCms()
    await run(cms)
    cms.calls.length = 0
    const pages = changed('theming', (p) => {
      p.seo = { metaTitle: p.seo.metaTitle }
    })

    const plan = await run(cms, pages)

    expect(where(plan, '/theming')).toMatchObject({ kind: 'update', reasons: ['seo'] })
    expect(stored(cms, '/theming').seo).toEqual({
      metaTitle: fixtures.find((f) => f.slug === 'theming')?.seo.metaTitle,
    })

    cms.calls.length = 0
    await run(cms, pages)
    expect(cms.writes()).toEqual([])
  })

  test('a default changed in the CMS is patched back without rebuilding the tree', async () => {
    const cms = new FakeCms()
    await run(cms)
    defined(stored(cms, '/theming').nodes[0]).props.fromDefaults = false
    cms.calls.length = 0

    const plan = await run(cms)

    expect(where(plan, '/theming')).toMatchObject({ kind: 'update', reasons: ['blocks'] })
    expect(cms.writes()).toEqual(['updateBlockProps', 'publishPage'])
    expect(defined(stored(cms, '/theming').nodes[0]).props.fromDefaults).toBe(true)
  })
})

describe('locales', () => {
  test('a page of another locale with the same slug is neither read as the fixture nor touched', async () => {
    const cms = new FakeCms()
    cms.seed('/home', {
      locale: 'pl',
      title: 'Start',
      nodes: [{ id: 'x', type: 'prose', props: {} }],
    })
    const pl = defined([...cms.pages.values()][0])

    const plan = await run(cms)

    expect(plan.filter((a) => a.slug === '/home').map((a) => [a.kind, a.locale])).toEqual([
      ['create', undefined],
      ['skip', 'pl'],
    ])
    expect(formatPlan(plan)).toContain('skip    /home [pl] (not in fixtures)')
    expect(pl).toMatchObject({ title: 'Start', status: 'published', updatedAt: 1 })
    expect(stored(cms, '/home')).toBeDefined()
    expect(cms.pages.size).toBe(fixtures.length + 1)
  })
})

describe('the CMS as a content source', () => {
  afterEach(() => vi.unstubAllGlobals())

  /** The delivery API of glokki as it answers: slugs with a leading `/`. */
  function deliveryOf(cms: FakeCms) {
    const published = () => [...cms.pages.values()].filter((p) => p.status === 'published')
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      })
    return vi.fn(async (input: string | URL | Request) => {
      const { pathname } = new URL(String(input))
      if (pathname === '/api/v1/delivery/navigation') {
        return json({
          data: published().map((p) => ({ slug: p.slug, title: p.title, locale: p.locale })),
        })
      }
      if (pathname === '/api/v1/delivery/pages') {
        const data = published().map((p) => ({
          pageId: p.id,
          versionId: 'v1',
          version: 1,
          title: p.title,
          slug: p.slug,
          locale: p.locale,
          publishedAt: '2026-10-25T00:00:00.000Z',
        }))
        return json({ data, meta: { total: data.length, limit: 100, offset: 0 } })
      }
      const bySlug = '/api/v1/delivery/pages/by-slug'
      if (pathname.startsWith(`${bySlug}/`)) {
        const page = published().find((p) => p.slug === pathname.slice(bySlug.length))
        if (!page) return json({ error: { code: 'NOT_FOUND', message: 'No such page' } }, 404)
        return json({
          data: {
            pageId: page.id,
            versionId: 'v1',
            version: 1,
            title: page.title,
            slug: page.slug,
            componentTree: page.nodes,
            seo: page.seo,
            codeInjection: {},
            locale: page.locale,
            publishedAt: '2026-10-25T00:00:00.000Z',
            layout: { key: 'default', header: null, footer: null },
          },
        })
      }
      return json({ error: { code: 'NOT_FOUND', message: pathname } }, 404)
    })
  }

  test('after a seed every page of navigation.json with a fixture is available and readable', async () => {
    const cms = new FakeCms()
    await run(cms)
    vi.stubGlobal('fetch', deliveryOf(cms))
    const source = createGlokkiSource({
      baseUrl: 'https://cms.test',
      tenant: 'docs',
      apiKey: 'k',
      navigationConfig: async () => navigation,
    })

    const items = (await source.getNavigation()).groups.flatMap((g) => g.items)
    for (const item of items) {
      expect(item.available, item.slug).toBe(fixtures.some((f) => f.slug === item.slug))
    }

    for (const fixture of fixtures) {
      const page = await source.getPage(fixture.slug)
      expect(page?.slug).toBe(fixture.slug)
      expect(page?.title).toBe(fixture.title)
    }
    expect((await source.listPages()).map((p) => p.slug).sort()).toEqual(
      fixtures.map((f) => f.slug).sort(),
    )
  })
})

describe('a page with unpublished changes', () => {
  test('is updated with a publish and nothing else', async () => {
    const cms = new FakeCms()
    await run(cms)
    const page = stored(cms, '/palettes')
    page.status = 'draft'
    cms.calls.length = 0

    const plan = await run(cms)

    expect(where(plan, '/palettes')).toMatchObject({ kind: 'update', reasons: ['unpublished'] })
    expect(cms.writes()).toEqual(['publishPage'])
    expect(page.status).toBe('published')
  })
})

test('a fixture with nested blocks is refused', async () => {
  const pages = changed('home', (p) => {
    firstNode(p).children = [{ id: 'c', type: 'prose', props: {} }]
  })

  expect(() =>
    planSeed(pages, navigation, { pages: [], details: new Map(), defaults: new Map() }),
  ).toThrow(/home: nested blocks/)
})
